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
@Component("copyRule")
@RequiredArgsConstructor
public class CopyRuleTool implements Function<CopyRuleTool.Request, String> {

    private final TagRuleService tagRuleService;
    private final AiPendingOperationMapper pendingOpMapper;
    private final ObjectMapper objectMapper;

    public record Request(
            @JsonProperty("ruleId") @JsonPropertyDescription("要复制的规则ID") Long ruleId
    ) {}

    @Override
    public String apply(Request request) {
        try {
            TagRule rule = tagRuleService.getById(request.ruleId());
            if (rule == null) {
                return "{\"error\": \"规则不存在，ID: " + request.ruleId() + "\"}";
            }

            String desc = "复制规则「" + rule.getRuleName() + "」为新草稿版本";

            Map<String, Object> opData = new LinkedHashMap<>();
            opData.put("ruleId", request.ruleId());

            AiPendingOperation pendingOp = new AiPendingOperation();
            pendingOp.setSessionId(SessionContext.get() != null ? SessionContext.get() : "unknown");
            pendingOp.setSkillCode("copy_rule");
            pendingOp.setOperationDesc(desc);
            pendingOp.setOperationData(objectMapper.writeValueAsString(opData));
            pendingOp.setImpactSummary("将基于「" + rule.getRuleName() + "」(v" + rule.getVersionNo() + ")创建新的草稿版本。");
            pendingOp.setStatus("PENDING");
            pendingOp.setExpiresAt(LocalDateTime.now().plusMinutes(30));
            pendingOpMapper.insert(pendingOp);

            Map<String, Object> response = new LinkedHashMap<>();
            response.put("pendingOperationId", pendingOp.getId());
            response.put("operationDesc", desc);
            response.put("message", "操作已准备就绪，等待用户确认后执行。");
            return objectMapper.writeValueAsString(response);
        } catch (Exception e) {
            log.error("准备复制规则失败", e);
            return "{\"error\": \"准备复制规则失败: " + e.getMessage() + "\"}";
        }
    }
}
