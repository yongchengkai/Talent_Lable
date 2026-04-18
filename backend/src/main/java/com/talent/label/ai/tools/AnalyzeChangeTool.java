package com.talent.label.ai.tools;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.talent.label.domain.entity.*;
import com.talent.label.mapper.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Component("analyzeChange")
@RequiredArgsConstructor
public class AnalyzeChangeTool implements Function<AnalyzeChangeTool.Request, String> {

    private final ChangeNotificationMapper notificationMapper;
    private final EmployeeMapper employeeMapper;
    private final TagRuleMapper ruleMapper;
    private final TagRuleConditionMapper conditionMapper;
    private final TagRuleScopeMapper scopeMapper;
    private final AiRuleConfigMapper aiRuleConfigMapper;
    private final EmployeeTagResultMapper tagResultMapper;
    private final ObjectMapper objectMapper;

    public record Request(
            @JsonProperty("notificationId")
            @JsonPropertyDescription("变更通知ID") Long notificationId
    ) {}

    @Override
    public String apply(Request request) {
        try {
            return doAnalyze(request.notificationId());
        } catch (Exception e) {
            log.error("变更影响分析失败", e);
            return toJson(Map.of("error", "分析失败: " + e.getMessage()));
        }
    }

    private String doAnalyze(Long notificationId) throws Exception {
        // 1. 加载通知
        ChangeNotification notification = notificationMapper.selectById(notificationId);
        if (notification == null) {
            return toJson(Map.of("error", "通知不存在，ID: " + notificationId));
        }

        // 2. 加载员工当前数据
        Employee employee = employeeMapper.selectById(notification.getEmployeeId());

        // 3. 解析变更字段和受影响规则
        List<Map<String, String>> changedFields = objectMapper.readValue(
                notification.getChangedFields(), new TypeReference<>() {});
        List<Map<String, Object>> affectedRules = objectMapper.readValue(
                notification.getAffectedRules(), new TypeReference<>() {});

        // 4. 构建分析结果
        Map<String, Object> analysis = new LinkedHashMap<>();
        analysis.put("notificationId", notificationId);
        analysis.put("severity", notification.getSeverity());
        analysis.put("changeType", notification.getChangeType());
        analysis.put("changeSummary", notification.getChangeSummary());

        // 员工信息
        Map<String, Object> empInfo = new LinkedHashMap<>();
        empInfo.put("employeeNo", notification.getEmployeeNo());
        empInfo.put("employeeName", notification.getEmployeeName());
        if (employee != null) {
            empInfo.put("currentOrg", employee.getOrgName());
            empInfo.put("currentGrade", employee.getGradeLevel());
            empInfo.put("currentStatus", employee.getEmployeeStatus());
        }
        analysis.put("employee", empInfo);

        // 变更详情
        analysis.put("changedFields", changedFields);

        // 离职特殊处理
        if ("STATUS_CHANGE".equals(notification.getChangeType())) {
            analysis.put("action", "TAGS_INVALIDATED");
            analysis.put("actionDesc", "员工已离职，所有标签已自动失效，无需额外操作");
            return toJson(analysis);
        }

        // 新入职
        if ("INSERT".equals(notification.getChangeType())) {
            analysis.put("action", "FULL_CALC_NEEDED");
            analysis.put("actionDesc", "新入职员工，建议对所有已发布规则执行一次完整计算");
            analysis.put("affectedRuleCount", countPublishedRules());
            return toJson(analysis);
        }

        // 5. 逐条分析受影响的规则
        List<Map<String, Object>> ruleAnalysis = new ArrayList<>();
        for (Map<String, Object> ruleInfo : affectedRules) {
            Long ruleId = ((Number) ruleInfo.get("ruleId")).longValue();
            TagRule rule = ruleMapper.selectById(ruleId);
            if (rule == null) continue;

            Map<String, Object> ra = new LinkedHashMap<>();
            ra.put("ruleId", ruleId);
            ra.put("ruleName", rule.getRuleName());
            ra.put("ruleType", rule.getRuleType());
            ra.put("reason", ruleInfo.get("reason"));

            // 查看该员工当前是否有这条规则产出的标签
            long existingTags = tagResultMapper.selectCount(
                    new LambdaQueryWrapper<EmployeeTagResult>()
                            .eq(EmployeeTagResult::getEmployeeId, notification.getEmployeeId())
                            .eq(EmployeeTagResult::getSourceRuleId, ruleId)
                            .eq(EmployeeTagResult::getValidFlag, true));
            ra.put("currentTagCount", existingTags);
            ra.put("needsRefresh", true);

            // 判断影响类型
            if (existingTags > 0) {
                ra.put("impact", "现有标签可能需要更新或失效");
            } else {
                ra.put("impact", "变更后可能新增标签命中");
            }

            ruleAnalysis.add(ra);
        }

        analysis.put("affectedRules", ruleAnalysis);
        analysis.put("affectedRuleCount", ruleAnalysis.size());

        // 6. 建议操作
        if (ruleAnalysis.isEmpty()) {
            analysis.put("action", "NO_ACTION");
            analysis.put("actionDesc", "变更未影响任何已发布规则，无需操作");
        } else {
            analysis.put("action", "CREATE_TASK");
            analysis.put("actionDesc", String.format(
                    "建议创建计算任务，对 %d 条受影响规则重新计算该员工的标签。可以先用模拟模式验证，再正式执行。",
                    ruleAnalysis.size()));
            // 提供可直接用于创建任务的规则 ID 列表
            List<Long> ruleIds = ruleAnalysis.stream()
                    .map(r -> ((Number) r.get("ruleId")).longValue())
                    .toList();
            analysis.put("suggestedRuleIds", ruleIds);
        }

        return toJson(analysis);
    }

    private long countPublishedRules() {
        return ruleMapper.selectCount(
                new LambdaQueryWrapper<TagRule>().eq(TagRule::getStatus, "PUBLISHED"));
    }

    private String toJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return "{\"error\":\"JSON序列化失败\"}";
        }
    }
}
