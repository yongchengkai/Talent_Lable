package com.talent.label.ai.tools;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.talent.label.ai.SessionContext;
import com.talent.label.domain.entity.AiPendingOperation;
import com.talent.label.domain.entity.TagRule;
import com.talent.label.mapper.AiPendingOperationMapper;
import com.talent.label.service.TagRuleService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;

@Slf4j
@Component("updateRule")
@RequiredArgsConstructor
public class UpdateRuleTool implements Function<UpdateRuleTool.Request, String> {

    private final TagRuleService tagRuleService;
    private final AiPendingOperationMapper pendingOpMapper;
    private final ObjectMapper objectMapper;

    public record Request(
            @JsonProperty("ruleId") @JsonPropertyDescription("要修改的规则ID") Long ruleId,
            @JsonProperty("ruleName") @JsonPropertyDescription("新的规则名称（可选）") String ruleName,
            @JsonProperty("dslContent") @JsonPropertyDescription("新的DSL内容（可选）") String dslContent,
            @JsonProperty("dslExplain") @JsonPropertyDescription("新的规则说明（可选）") String dslExplain,
            @JsonProperty("priority") @JsonPropertyDescription("新的优先级（可选）") Integer priority,
            @JsonProperty("changeDescription") @JsonPropertyDescription("本次修改的描述") String changeDescription
    ) {}

    @Override
    public String apply(Request request) {
        try {
            TagRule rule = tagRuleService.getById(request.ruleId());
            if (rule == null) {
                return "{\"error\": \"规则不存在，ID: " + request.ruleId() + "\"}";
            }

            StringBuilder desc = new StringBuilder();
            desc.append("修改规则「").append(rule.getRuleName()).append("」");
            if (request.changeDescription() != null) {
                desc.append("：").append(request.changeDescription());
            }

            Map<String, Object> opData = new LinkedHashMap<>();
            opData.put("ruleId", request.ruleId());
            opData.put("originalStatus", rule.getStatus());
            opData.put("needsCopy", "PUBLISHED".equals(rule.getStatus()));
            if (request.ruleName() != null) opData.put("ruleName", request.ruleName());
            if (request.dslContent() != null) opData.put("dslContent", request.dslContent());
            if (request.dslExplain() != null) opData.put("dslExplain", request.dslExplain());
            if (request.priority() != null) opData.put("priority", request.priority());

            String impact = "目标规则：" + rule.getRuleName() + "（" + rule.getStatus() + "）";
            if ((boolean) opData.get("needsCopy")) {
                impact += "。该规则已发布/已停用，将自动复制为新草稿版本后再修改。";
            }

            AiPendingOperation pendingOp = new AiPendingOperation();
            pendingOp.setSessionId(SessionContext.get() != null ? SessionContext.get() : "unknown");
            pendingOp.setSkillCode("update_rule");
            pendingOp.setOperationDesc(desc.toString());
            pendingOp.setOperationData(objectMapper.writeValueAsString(opData));
            pendingOp.setImpactSummary(impact);
            pendingOp.setStatus("PENDING");
            pendingOp.setExpiresAt(LocalDateTime.now().plusMinutes(30));
            pendingOpMapper.insert(pendingOp);

            Map<String, Object> response = new LinkedHashMap<>();
            response.put("pendingOperationId", pendingOp.getId());
            response.put("operationDesc", desc.toString());
            response.put("impact", impact);
            response.put("message", "操作已准备就绪，等待用户确认后执行。");
            return objectMapper.writeValueAsString(response);
        } catch (Exception e) {
            log.error("准备修改规则失败", e);
            return "{\"error\": \"准备修改规则失败: " + e.getMessage() + "\"}";
        }
    }
}
