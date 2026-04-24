package com.talent.label.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.talent.label.ai.AssistantPrompts;
import com.talent.label.ai.DynamicChatModelFactory;
import com.talent.label.common.BizException;
import com.talent.label.domain.dto.ChatContext;
import com.talent.label.domain.entity.AiChatMessage;
import com.talent.label.domain.entity.AiChatSession;
import com.talent.label.domain.entity.AiPendingOperation;
import com.talent.label.domain.entity.AiSkill;
import com.talent.label.domain.entity.AiWidgetType;
import com.talent.label.domain.entity.EmployeeFieldRegistry;
import com.talent.label.mapper.AiChatMessageMapper;
import com.talent.label.mapper.AiChatSessionMapper;
import com.talent.label.mapper.AiPendingOperationMapper;
import com.talent.label.mapper.AiSkillMapper;
import com.talent.label.mapper.AiWidgetTypeMapper;
import com.talent.label.mapper.EmployeeFieldRegistryMapper;
import com.talent.label.service.ChangeNotificationService;
import com.talent.label.service.ChatAssistantService;
import com.talent.label.service.SkillService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.model.function.FunctionCallback;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executors;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatAssistantServiceImpl implements ChatAssistantService {

    private final DynamicChatModelFactory chatModelFactory;
    private final SkillService skillService;
    private final ChangeNotificationService changeNotificationService;
    private final AiChatSessionMapper sessionMapper;
    private final AiChatMessageMapper messageMapper;
    private final AiSkillMapper skillMapper;
    private final AiPendingOperationMapper pendingOpMapper;
    private final ObjectMapper objectMapper;
    private final AiWidgetTypeMapper widgetTypeMapper;
    private final EmployeeFieldRegistryMapper fieldRegistryMapper;
    /** 由 AiToolConfig 注册的所有 FunctionCallback */
    private final List<FunctionCallback> talentLabelTools;

    private static final int MAX_HISTORY_MESSAGES = 20;

    @Override
    public SseEmitter streamChat(String sessionId, String message, ChatContext context) {
        SseEmitter emitter = new SseEmitter(120_000L);
        final ChatContext ctx = context != null ? context : new ChatContext();

        CompletableFuture.runAsync(() -> {
            try {
                // 0. 设置 SessionContext，让工具类可以获取当前会话 ID
                com.talent.label.ai.SessionContext.set(sessionId);

                // 1. 保存用户消息
                saveMessage(sessionId, "user", message, null);

                // 2. 加载活跃 Skill（用于构建 system prompt）
                List<AiSkill> activeSkills = skillService.listActive();

                // 2.5 注入未读通知数到上下文
                try {
                    long unread = changeNotificationService.countUnread();
                    ctx.setUnreadNotifications((int) unread);
                } catch (Exception ex) {
                    log.warn("查询未读通知数失败", ex);
                }

                // 3. 加载可用 widget 类型
                List<AiWidgetType> widgetTypes = widgetTypeMapper.selectList(
                        new LambdaQueryWrapper<AiWidgetType>()
                                .eq(AiWidgetType::getEnabled, true)
                                .orderByAsc(AiWidgetType::getSortOrder));

                // 3.5 加载可用字段列表
                List<EmployeeFieldRegistry> fields = fieldRegistryMapper.selectList(
                        new LambdaQueryWrapper<EmployeeFieldRegistry>()
                                .eq(EmployeeFieldRegistry::getEnabled, true)
                                .orderByAsc(EmployeeFieldRegistry::getSortOrder));

                // 4. 构建 system prompt（自然语言描述版）
                String systemPrompt = AssistantPrompts.buildSystemPrompt(ctx, activeSkills, widgetTypes, fields);

                // 4. 加载历史消息
                List<Message> messages = loadHistory(sessionId);
                messages.add(0, new SystemMessage(systemPrompt));
                messages.add(new UserMessage(message));

                // 5. 获取动态模型
                ChatModel chatModel = chatModelFactory.getDefaultModel();

                // 6. 构建 ChatOptions，直接使用 AiToolConfig 注册的 FunctionCallback
                OpenAiChatOptions.Builder optionsBuilder = OpenAiChatOptions.builder();
                if (!talentLabelTools.isEmpty()) {
                    optionsBuilder.withFunctionCallbacks(talentLabelTools);
                }

                // 7. 调用模型（Spring AI 自动处理 function call → execute → feed back → final answer）
                Prompt prompt = new Prompt(messages, optionsBuilder.build());

                emitter.send(SseEmitter.event().name("thinking").data("正在思考..."));

                var response = chatModel.call(prompt);
                String assistantContent = response.getResult().getOutput().getContent();

                if (assistantContent == null) assistantContent = "";

                // 8. 整段发送完整内容（JSON 编码确保单行，避免 SSE 换行拆分）
                String encodedContent = objectMapper.writeValueAsString(assistantContent);
                emitter.send(SseEmitter.event().name("content").data(encodedContent));

                // 9. 检查是否有待确认操作，如果有则附加到消息中
                List<AiPendingOperation> pendingOps = pendingOpMapper.selectList(
                        new LambdaQueryWrapper<AiPendingOperation>()
                                .eq(AiPendingOperation::getSessionId, sessionId)
                                .eq(AiPendingOperation::getStatus, "PENDING")
                                .orderByDesc(AiPendingOperation::getCreatedAt));

                String pendingOpJson = null;
                if (!pendingOps.isEmpty()) {
                    List<Map<String, Object>> opList = new ArrayList<>();
                    for (AiPendingOperation op : pendingOps) {
                        Map<String, Object> opMap = new LinkedHashMap<>();
                        opMap.put("operationId", String.valueOf(op.getId()));
                        opMap.put("type", op.getSkillCode());
                        opMap.put("targetName", op.getOperationDesc());
                        opMap.put("skillCode", op.getSkillCode());
                        opMap.put("impact", op.getImpactSummary());
                        opMap.put("status", "pending");
                        opMap.put("message", op.getOperationDesc());
                        opList.add(opMap);
                    }
                    pendingOpJson = objectMapper.writeValueAsString(opList.get(0));
                }

                // 10. 保存助手消息
                saveMessage(sessionId, "assistant", assistantContent, pendingOpJson);

                // 11. 更新会话信息
                updateSessionInfo(sessionId);

                emitter.send(SseEmitter.event().name("done").data("[DONE]"));
                emitter.complete();

            } catch (Exception e) {
                log.error("对话处理失败", e);
                try {
                    String errorMsg = "抱歉，处理您的请求时出现了问题：" + e.getMessage();
                    emitter.send(SseEmitter.event().name("error").data(errorMsg));
                    saveMessage(sessionId, "assistant", errorMsg, null);
                } catch (IOException ex) {
                    log.error("发送错误消息失败", ex);
                }
                emitter.completeWithError(e);
            } finally {
                com.talent.label.ai.SessionContext.clear();
            }
        }, Executors.newCachedThreadPool());

        emitter.onTimeout(emitter::complete);
        emitter.onError(e -> log.warn("SSE连接异常: {}", e.getMessage()));

        return emitter;
    }

    @Override
    public AiChatSession createSession() {
        AiChatSession session = new AiChatSession();
        session.setSessionId(UUID.randomUUID().toString().replace("-", "").substring(0, 16));
        session.setTitle("新对话");
        session.setMessageCount(0);
        session.setCreatedBy("admin");
        sessionMapper.insert(session);
        return session;
    }

    @Override
    public List<AiChatSession> listSessions() {
        return sessionMapper.selectList(
                new LambdaQueryWrapper<AiChatSession>()
                        .orderByDesc(AiChatSession::getUpdatedAt));
    }

    @Override
    public List<AiChatMessage> getHistory(String sessionId) {
        return messageMapper.selectList(
                new LambdaQueryWrapper<AiChatMessage>()
                        .eq(AiChatMessage::getSessionId, sessionId)
                        .orderByAsc(AiChatMessage::getCreatedAt));
    }

    @Override
    public void deleteSession(String sessionId) {
        sessionMapper.delete(
                new LambdaQueryWrapper<AiChatSession>()
                        .eq(AiChatSession::getSessionId, sessionId));
        messageMapper.delete(
                new LambdaQueryWrapper<AiChatMessage>()
                        .eq(AiChatMessage::getSessionId, sessionId));
    }

    @Override
    public Map<String, Object> confirmOperation(String sessionId, String operationId, boolean approved) {
        AiPendingOperation op = pendingOpMapper.selectById(Long.parseLong(operationId));
        if (op == null) {
            throw new BizException("操作不存在或已过期");
        }
        if (!"PENDING".equals(op.getStatus())) {
            throw new BizException("操作已处理，当前状态: " + op.getStatus());
        }

        Map<String, Object> result = new HashMap<>();
        if (!approved) {
            op.setStatus("REJECTED");
            pendingOpMapper.updateById(op);
            result.put("status", "rejected");
            result.put("message", "操作已取消");
            return result;
        }

        // 用户确认后，通过 AI 对话来执行确认操作
        // 构造一条确认消息让 LLM 调用 confirmOperation 工具
        op.setStatus("CONFIRMED");
        pendingOpMapper.updateById(op);

        // 直接通过 ConfirmOperationTool 的逻辑执行
        // 这里简化处理：直接标记为已确认，实际执行由 LLM 在下一轮对话中完成
        result.put("status", "confirmed");
        result.put("message", "操作已确认");
        result.put("operationId", operationId);

        saveMessage(sessionId, "assistant",
                "✅ 操作已确认执行：" + op.getOperationDesc(), null);

        return result;
    }

    private List<Message> loadHistory(String sessionId) {
        List<AiChatMessage> history = messageMapper.selectList(
                new LambdaQueryWrapper<AiChatMessage>()
                        .eq(AiChatMessage::getSessionId, sessionId)
                        .orderByAsc(AiChatMessage::getCreatedAt)
                        .last("LIMIT " + MAX_HISTORY_MESSAGES));

        List<Message> messages = new ArrayList<>();
        for (AiChatMessage msg : history) {
            switch (msg.getRole()) {
                case "user" -> messages.add(new UserMessage(msg.getContent()));
                case "assistant" -> messages.add(new AssistantMessage(msg.getContent()));
            }
        }
        return messages;
    }

    private void saveMessage(String sessionId, String role, String content, String pendingOp) {
        AiChatMessage msg = new AiChatMessage();
        msg.setSessionId(sessionId);
        msg.setRole(role);
        msg.setContent(content);
        msg.setPendingOp(pendingOp);
        messageMapper.insert(msg);
    }

    private void updateSessionInfo(String sessionId) {
        AiChatSession session = sessionMapper.selectOne(
                new LambdaQueryWrapper<AiChatSession>()
                        .eq(AiChatSession::getSessionId, sessionId));
        if (session != null) {
            Long count = messageMapper.selectCount(
                    new LambdaQueryWrapper<AiChatMessage>()
                            .eq(AiChatMessage::getSessionId, sessionId));
            session.setMessageCount(count.intValue());
            session.setLastMessageAt(LocalDateTime.now());

            if ("新对话".equals(session.getTitle())) {
                AiChatMessage firstMsg = messageMapper.selectOne(
                        new LambdaQueryWrapper<AiChatMessage>()
                                .eq(AiChatMessage::getSessionId, sessionId)
                                .eq(AiChatMessage::getRole, "user")
                                .orderByAsc(AiChatMessage::getCreatedAt)
                                .last("LIMIT 1"));
                if (firstMsg != null) {
                    String title = firstMsg.getContent();
                    if (title.length() > 30) title = title.substring(0, 30) + "...";
                    session.setTitle(title);
                }
            }
            sessionMapper.updateById(session);
        }
    }
}
