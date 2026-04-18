package com.talent.label.ai.tools;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.talent.label.ai.SessionContext;
import com.talent.label.domain.entity.AiPendingOperation;
import com.talent.label.mapper.AiPendingOperationMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;

@Slf4j
@Component("createRule")
@RequiredArgsConstructor
public class CreateRuleTool implements Function<CreateRuleTool.Request, String> {

    private final AiPendingOperationMapper pendingOpMapper;
    private final ObjectMapper objectMapper;

    public record Request(
            @JsonProperty("ruleName") @JsonPropertyDescription("规则名称") String ruleName,
            @JsonProperty("ruleCode") @JsonPropertyDescription("规则编码") String ruleCode,
            @JsonProperty("ruleType") @JsonPropertyDescription("规则类型: STRUCTURED/AI_SEMANTIC") String ruleType,
            @JsonProperty("dslContent") @JsonPropertyDescription("DSL内容") String dslContent,
            @JsonProperty("dslExplain") @JsonPropertyDescription("规则说明") String dslExplain,
            @JsonProperty("priority") @JsonPropertyDescription("优先级") Integer priority
    ) {}

    @Override
    public String apply(Request request) {
        try {
            String desc = "创建新规则「" + request.ruleName() + "」（" + request.ruleType() + "）";

            Map<String, Object> opData = new LinkedHashMap<>();
            opData.put("ruleName", request.ruleName());
            opData.put("ruleCode", request.ruleCode());
            opData.put("ruleType", request.ruleType() != null ? request.ruleType() : "STRUCTURED");
            if (request.dslContent() != null) opData.put("dslContent", request.dslContent());
            if (request.dslExplain() != null) opData.put("dslExplain", request.dslExplain());
            if (request.priority() != null) opData.put("priority", request.priority());

            AiPendingOperation pendingOp = new AiPendingOperation();
            pendingOp.setSessionId(SessionContext.get() != null ? SessionContext.get() : "unknown");
            pendingOp.setSkillCode("create_rule");
            pendingOp.setOperationDesc(desc);
            pendingOp.setOperationData(objectMapper.writeValueAsString(opData));
            pendingOp.setImpactSummary("将创建一条新的" + request.ruleType() + "规则，初始状态为草稿。");
            pendingOp.setStatus("PENDING");
            pendingOp.setExpiresAt(LocalDateTime.now().plusMinutes(30));
            pendingOpMapper.insert(pendingOp);

            Map<String, Object> response = new LinkedHashMap<>();
            response.put("pendingOperationId", pendingOp.getId());
            response.put("operationDesc", desc);
            response.put("message", "操作已准备就绪，等待用户确认后执行。");
            return objectMapper.writeValueAsString(response);
        } catch (Exception e) {
            log.error("准备创建规则失败", e);
            return "{\"error\": \"准备创建规则失败: " + e.getMessage() + "\"}";
        }
    }
}
