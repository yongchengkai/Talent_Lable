package com.talent.label.ai.tools;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
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
@Component("estimateRuleImpact")
@RequiredArgsConstructor
public class EstimateRuleImpactTool implements Function<EstimateRuleImpactTool.Request, String> {

    private final TagRuleMapper tagRuleMapper;
    private final TagRuleConditionMapper conditionMapper;
    private final EmployeeMapper employeeMapper;
    private final EmployeeTagResultMapper resultMapper;
    private final ObjectMapper objectMapper;

    public record Request(
            @JsonProperty("ruleId") @JsonPropertyDescription("规则ID") Long ruleId,
            @JsonProperty("newConditionDesc") @JsonPropertyDescription("修改后的条件描述，用于对比分析") String newConditionDesc
    ) {}

    @Override
    public String apply(Request request) {
        try {
            TagRule rule = tagRuleMapper.selectById(request.ruleId());
            if (rule == null) {
                return "{\"error\": \"规则不存在，ID: " + request.ruleId() + "\"}";
            }

            Map<String, Object> impact = new LinkedHashMap<>();
            impact.put("ruleId", rule.getId());
            impact.put("ruleName", rule.getRuleName());
            impact.put("ruleStatus", rule.getStatus());

            // 查询当前规则的条件
            List<TagRuleCondition> conditions = conditionMapper.selectList(
                    new LambdaQueryWrapper<TagRuleCondition>()
                            .eq(TagRuleCondition::getRuleId, rule.getId()));

            List<Map<String, String>> condDesc = new ArrayList<>();
            for (TagRuleCondition c : conditions) {
                Map<String, String> cd = new LinkedHashMap<>();
                cd.put("field", c.getFieldName() != null ? c.getFieldName() : c.getFieldCode());
                cd.put("operator", c.getOperator());
                cd.put("value", c.getValueExpr());
                condDesc.add(cd);
            }
            impact.put("currentConditions", condDesc);

            // 统计当前命中的员工数
            Long currentHitCount = resultMapper.selectCount(
                    new LambdaQueryWrapper<EmployeeTagResult>()
                            .eq(EmployeeTagResult::getSourceRuleId, rule.getId())
                            .eq(EmployeeTagResult::getValidFlag, true));
            impact.put("currentHitCount", currentHitCount);

            // 获取当前命中的员工示例
            List<EmployeeTagResult> currentResults = resultMapper.selectList(
                    new LambdaQueryWrapper<EmployeeTagResult>()
                            .eq(EmployeeTagResult::getSourceRuleId, rule.getId())
                            .eq(EmployeeTagResult::getValidFlag, true)
                            .last("LIMIT 5"));
            if (!currentResults.isEmpty()) {
                List<Long> empIds = currentResults.stream()
                        .map(EmployeeTagResult::getEmployeeId).collect(Collectors.toList());
                List<Employee> employees = employeeMapper.selectBatchIds(empIds);
                List<String> names = employees.stream().map(e ->
                        e.getName() + "(" + e.getGradeLevel() + ")").collect(Collectors.toList());
                impact.put("currentHitSample", names);
            }

            // 统计全部员工数
            Long totalEmployees = employeeMapper.selectCount(new LambdaQueryWrapper<>());
            impact.put("totalEmployees", totalEmployees);
            impact.put("currentCoverageRate",
                    totalEmployees > 0 ? String.format("%.1f%%", currentHitCount * 100.0 / totalEmployees) : "0%");

            if (request.newConditionDesc() != null) {
                impact.put("newConditionDesc", request.newConditionDesc());
                impact.put("note", "请根据新条件描述评估影响变化。精确的命中人数需要在规则实际修改并执行后才能确定。");
            }

            return objectMapper.writeValueAsString(impact);
        } catch (Exception e) {
            log.error("评估规则影响失败", e);
            return "{\"error\": \"评估规则影响失败: " + e.getMessage() + "\"}";
        }
    }
}
