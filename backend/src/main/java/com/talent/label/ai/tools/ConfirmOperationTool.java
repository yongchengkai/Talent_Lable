package com.talent.label.ai.tools;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.talent.label.ai.SessionContext;
import com.talent.label.domain.entity.AiPendingOperation;
import com.talent.label.domain.entity.TagRule;
import com.talent.label.mapper.AiPendingOperationMapper;
import com.talent.label.service.CalcTaskService;
import com.talent.label.service.TagRuleService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.function.Function;

@Slf4j
@Component("confirmOperation")
@RequiredArgsConstructor
public class ConfirmOperationTool implements Function<ConfirmOperationTool.Request, String> {

    private final AiPendingOperationMapper pendingOpMapper;
    private final TagRuleService tagRuleService;
    private final CalcTaskService calcTaskService;
    private final ObjectMapper objectMapper;

    public record Request(
            @JsonProperty("operationId") @JsonPropertyDescription("待确认操作的ID") Long operationId
    ) {}

    @Override
    public String apply(Request request) {
        try {
            // 优先按 operationId 查找
            AiPendingOperation op = null;
            if (request.operationId() != null) {
                op = pendingOpMapper.selectById(request.operationId());
            }

            // 如果没找到，按 sessionId 查找最近的 PENDING 操作
            String sessionId = SessionContext.get();
            if (op == null && sessionId != null) {
                List<AiPendingOperation> pendingOps = pendingOpMapper.selectList(
                        new LambdaQueryWrapper<AiPendingOperation>()
                                .eq(AiPendingOperation::getSessionId, sessionId)
                                .eq(AiPendingOperation::getStatus, "PENDING")
                                .orderByDesc(AiPendingOperation::getCreatedAt)
                                .last("LIMIT 1"));
                if (!pendingOps.isEmpty()) {
                    op = pendingOps.get(0);
                }
            }

            if (op == null) {
                return "{\"error\": \"未找到待确认的操作\"}";
            }
            if (!"PENDING".equals(op.getStatus())) {
                return "{\"error\": \"操作状态为" + op.getStatus() + "，不是待确认状态\"}";
            }

            // 解析操作数据
            Map<String, Object> opData = objectMapper.readValue(
                    op.getOperationData(), new TypeReference<>() {});

            String result = executeOperation(op.getSkillCode(), opData);

            // 更新状态为已确认
            op.setStatus("CONFIRMED");
            pendingOpMapper.updateById(op);

            Map<String, Object> response = new LinkedHashMap<>();
            response.put("operationId", op.getId());
            response.put("skillCode", op.getSkillCode());
            response.put("operationDesc", op.getOperationDesc());
            response.put("status", "CONFIRMED");
            response.put("result", result);
            return objectMapper.writeValueAsString(response);
        } catch (Exception e) {
            log.error("执行确认操作失败", e);
            return "{\"error\": \"执行确认操作失败: " + e.getMessage() + "\"}";
        }
    }

    private String executeOperation(String skillCode, Map<String, Object> opData) {
        try {
            switch (skillCode) {
                case "update_rule" -> {
                    Long ruleId = toLong(opData.get("ruleId"));
                    boolean needsCopy = Boolean.TRUE.equals(opData.get("needsCopy"));

                    Long targetRuleId = ruleId;
                    if (needsCopy) {
                        TagRule copied = tagRuleService.copy(ruleId);
                        targetRuleId = copied.getId();
                    }

                    TagRule updateData = new TagRule();
                    if (opData.containsKey("ruleName")) updateData.setRuleName((String) opData.get("ruleName"));
                    if (opData.containsKey("dslContent")) updateData.setDslContent((String) opData.get("dslContent"));
                    if (opData.containsKey("dslExplain")) updateData.setDslExplain((String) opData.get("dslExplain"));
                    if (opData.containsKey("priority")) updateData.setPriority((Integer) opData.get("priority"));

                    tagRuleService.update(targetRuleId, updateData);
                    return "规则修改成功" + (needsCopy ? "（已自动复制为新版本，新规则ID: " + targetRuleId + "）" : "");
                }
                case "create_rule" -> {
                    TagRule newRule = new TagRule();
                    newRule.setRuleName((String) opData.get("ruleName"));
                    newRule.setRuleCode((String) opData.get("ruleCode"));
                    newRule.setRuleType((String) opData.get("ruleType"));
                    if (opData.containsKey("dslContent")) newRule.setDslContent((String) opData.get("dslContent"));
                    if (opData.containsKey("dslExplain")) newRule.setDslExplain((String) opData.get("dslExplain"));
                    if (opData.containsKey("priority")) newRule.setPriority((Integer) opData.get("priority"));

                    TagRule created = tagRuleService.create(newRule);
                    return "规则创建成功，ID: " + created.getId() + "，状态: 草稿";
                }
                case "publish_rule" -> {
                    Long ruleId = toLong(opData.get("ruleId"));
                    tagRuleService.publish(ruleId);
                    return "规则发布成功";
                }
                case "unpublish_rule" -> {
                    Long ruleId = toLong(opData.get("ruleId"));
                    tagRuleService.stop(ruleId);
                    return "规则已撤销发布";
                }
                case "copy_rule" -> {
                    Long ruleId = toLong(opData.get("ruleId"));
                    TagRule copied = tagRuleService.copy(ruleId);
                    return "规则复制成功，新规则ID: " + copied.getId();
                }
                case "run_task" -> {
                    Long taskId = toLong(opData.get("taskId"));
                    calcTaskService.run(taskId);
                    return "任务执行已启动";
                }
                case "submit_task" -> {
                    Long taskId = toLong(opData.get("taskId"));
                    calcTaskService.submit(taskId);
                    return "任务结果已提交";
                }
                default -> {
                    return "未知的操作类型: " + skillCode;
                }
            }
        } catch (Exception e) {
            log.error("执行操作失败: {} - {}", skillCode, e.getMessage(), e);
            return "执行失败: " + e.getMessage();
        }
    }

    private Long toLong(Object value) {
        if (value instanceof Long l) return l;
        if (value instanceof Integer i) return i.longValue();
        if (value instanceof String s) return Long.parseLong(s);
        return null;
    }
}
