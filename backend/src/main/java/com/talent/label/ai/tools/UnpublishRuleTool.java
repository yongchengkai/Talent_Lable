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
@Component("unpublishRule")
@RequiredArgsConstructor
public class UnpublishRuleTool implements Function<UnpublishRuleTool.Request, String> {

    private final TagRuleService tagRuleService;
    private final AiPendingOperationMapper pendingOpMapper;
    private final ObjectMapper objectMapper;

    public record Request(
            @JsonProperty("ruleId") @JsonPropertyDescription("要撤销发布的规则ID") Long ruleId
    ) {}

    @Override
    public String apply(Request request) {
        try {
            TagRule rule = tagRuleService.getById(request.ruleId());
            if (rule == null) {
                return "{\"error\": \"规则不存在，ID: " + request.ruleId() + "\"}";
            }
            if (!"PUBLISHED".equals(rule.getStatus())) {
                return "{\"error\": \"规则当前状态为" + rule.getStatus() + "，只有已发布的规则才能撤销发布\"}";
            }

            String desc = "撤销发布规则「" + rule.getRuleName() + "」";

            Map<String, Object> opData = new LinkedHashMap<>();
            opData.put("ruleId", request.ruleId());

            AiPendingOperation pendingOp = new AiPendingOperation();
            pendingOp.setSessionId(SessionContext.get() != null ? SessionContext.get() : "unknown");
            pendingOp.setSkillCode("unpublish_rule");
            pendingOp.setOperationDesc(desc);
            pendingOp.setOperationData(objectMapper.writeValueAsString(opData));
            pendingOp.setImpactSummary("撤销发布后，该规则产出的标签结果将失效。");
            pendingOp.setStatus("PENDING");
            pendingOp.setExpiresAt(LocalDateTime.now().plusMinutes(30));
            pendingOpMapper.insert(pendingOp);

            Map<String, Object> response = new LinkedHashMap<>();
            response.put("pendingOperationId", pendingOp.getId());
            response.put("operationDesc", desc);
            response.put("message", "操作已准备就绪，等待用户确认后执行。");
            return objectMapper.writeValueAsString(response);
        } catch (Exception e) {
            log.error("准备撤销发布失败", e);
            return "{\"error\": \"准备撤销发布失败: " + e.getMessage() + "\"}";
        }
    }
}
