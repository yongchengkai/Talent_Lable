package com.talent.label.ai.tools;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.talent.label.domain.entity.*;
import com.talent.label.mapper.*;
import com.talent.label.service.TagDefinitionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Component("checkReferences")
@RequiredArgsConstructor
public class CheckReferencesTool implements Function<CheckReferencesTool.Request, String> {

    private final TagCategoryMapper categoryMapper;
    private final TagDefinitionMapper tagDefinitionMapper;
    private final TagRuleMapper ruleMapper;
    private final TagRuleOutputMapper outputMapper;
    private final CalcTaskRuleMapper taskRuleMapper;
    private final CalcTaskMapper taskMapper;
    private final EmployeeTagResultMapper tagResultMapper;
    private final EmployeeTagResultDetailMapper detailMapper;
    private final TagDefinitionService tagDefinitionService;
    private final ObjectMapper objectMapper;

    public record Request(
            @JsonProperty("objectType") @JsonPropertyDescription("对象类型：category/tag/rule/employee") String objectType,
            @JsonProperty("objectId") @JsonPropertyDescription("对象ID") Long objectId
    ) {}

    @Override
    public String apply(Request req) {
        try {
            return switch (req.objectType()) {
                case "category" -> checkCategory(req.objectId());
                case "tag" -> checkTag(req.objectId());
                case "rule" -> checkRule(req.objectId());
                case "employee" -> checkEmployee(req.objectId());
                default -> toJson(Map.of("error", "不支持的对象类型: " + req.objectType()));
            };
        } catch (Exception e) {
            return toJson(Map.of("error", e.getMessage()));
        }
    }

    private String checkCategory(Long categoryId) {
        TagCategory category = categoryMapper.selectById(categoryId);
        if (category == null) return toJson(Map.of("error", "类目不存在"));

        long totalTags = tagDefinitionMapper.selectCount(
                new LambdaQueryWrapper<TagDefinition>().eq(TagDefinition::getCategoryId, categoryId));
        long activeTags = tagDefinitionMapper.selectCount(
                new LambdaQueryWrapper<TagDefinition>().eq(TagDefinition::getCategoryId, categoryId).eq(TagDefinition::getStatus, "ACTIVE"));
        long inactiveTags = totalTags - activeTags;

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("objectType", "category");
        result.put("objectId", categoryId);
        result.put("categoryName", category.getCategoryName());
        result.put("status", category.getStatus());
        result.put("totalTags", totalTags);
        result.put("activeTags", activeTags);
        result.put("inactiveTags", inactiveTags);
        result.put("canDisable", activeTags == 0);
        result.put("canDelete", totalTags == 0);
        if (!result.get("canDisable").equals(true)) {
            result.put("disableBlockReason", "类目下还有 " + activeTags + " 个启用标签，需先停用或迁移");
        }
        if (!result.get("canDelete").equals(true)) {
            result.put("deleteBlockReason", "类目下还有 " + totalTags + " 个标签，需先迁移或删除");
        }
        return toJson(result);
    }

    private String checkTag(Long tagId) {
        TagDefinition tag = tagDefinitionMapper.selectById(tagId);
        if (tag == null) return toJson(Map.of("error", "标签不存在"));

        // 引用该标签的规则
        List<Map<String, Object>> referencingRules = tagDefinitionService.getReferencingRules(tagId);

        // 历史标签结果引用
        long resultCount = tagResultMapper.selectCount(
                new LambdaQueryWrapper<EmployeeTagResult>().eq(EmployeeTagResult::getTagId, tagId));
        long activeResultCount = tagResultMapper.selectCount(
                new LambdaQueryWrapper<EmployeeTagResult>().eq(EmployeeTagResult::getTagId, tagId).eq(EmployeeTagResult::getValidFlag, true));

        // 证据引用
        long detailCount = detailMapper.selectCount(
                new LambdaQueryWrapper<EmployeeTagResultDetail>().eq(EmployeeTagResultDetail::getTagId, tagId));

        boolean hasRuleRef = !referencingRules.isEmpty();
        boolean hasResultRef = resultCount > 0;

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("objectType", "tag");
        result.put("objectId", tagId);
        result.put("tagName", tag.getTagName());
        result.put("tagCode", tag.getTagCode());
        result.put("status", tag.getStatus());
        result.put("referencingRuleCount", referencingRules.size());
        result.put("referencingRules", referencingRules);
        result.put("totalResultCount", resultCount);
        result.put("activeResultCount", activeResultCount);
        result.put("detailCount", detailCount);
        result.put("canDisable", !hasRuleRef);
        result.put("canDelete", !hasRuleRef && !hasResultRef);
        if (hasRuleRef) {
            result.put("disableBlockReason", "被 " + referencingRules.size() + " 条规则引用，不可停用");
            result.put("deleteBlockReason", "被 " + referencingRules.size() + " 条规则引用，不可删除");
        } else if (hasResultRef) {
            result.put("deleteBlockReason", "存在 " + resultCount + " 条历史打标结果引用，不可删除");
        }
        return toJson(result);
    }

    private String checkRule(Long ruleId) {
        TagRule rule = ruleMapper.selectById(ruleId);
        if (rule == null) return toJson(Map.of("error", "规则不存在"));

        // 关联的任务
        List<CalcTaskRule> taskRules = taskRuleMapper.selectList(
                new LambdaQueryWrapper<CalcTaskRule>().eq(CalcTaskRule::getRuleId, ruleId));
        List<Long> taskIds = taskRules.stream().map(CalcTaskRule::getTaskId).toList();

        long formalTaskCount = 0;
        long runningOrSuccessCount = 0;
        List<Map<String, Object>> taskList = new ArrayList<>();
        if (!taskIds.isEmpty()) {
            List<CalcTask> tasks = taskMapper.selectList(
                    new LambdaQueryWrapper<CalcTask>().in(CalcTask::getId, taskIds));
            for (CalcTask t : tasks) {
                if ("FORMAL".equals(t.getTaskMode())) {
                    formalTaskCount++;
                    if ("RUNNING".equals(t.getTaskStatus()) || "SUCCESS".equals(t.getTaskStatus())) {
                        runningOrSuccessCount++;
                    }
                }
                Map<String, Object> tm = new LinkedHashMap<>();
                tm.put("taskId", t.getId());
                tm.put("taskName", t.getTaskName());
                tm.put("taskMode", t.getTaskMode());
                tm.put("taskStatus", t.getTaskStatus());
                tm.put("submitStatus", t.getSubmitStatus());
                taskList.add(tm);
            }
        }

        // 标签结果
        long resultCount = tagResultMapper.selectCount(
                new LambdaQueryWrapper<EmployeeTagResult>().eq(EmployeeTagResult::getSourceRuleId, ruleId));
        long activeResultCount = tagResultMapper.selectCount(
                new LambdaQueryWrapper<EmployeeTagResult>().eq(EmployeeTagResult::getSourceRuleId, ruleId).eq(EmployeeTagResult::getValidFlag, true));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("objectType", "rule");
        result.put("objectId", ruleId);
        result.put("ruleName", rule.getRuleName());
        result.put("ruleCode", rule.getRuleCode());
        result.put("status", rule.getStatus());
        result.put("totalTaskCount", taskList.size());
        result.put("formalTaskCount", formalTaskCount);
        result.put("runningOrSuccessTaskCount", runningOrSuccessCount);
        result.put("tasks", taskList);
        result.put("totalResultCount", resultCount);
        result.put("activeResultCount", activeResultCount);
        result.put("canEdit", !"PUBLISHED".equals(rule.getStatus()));
        result.put("canDelete", !"PUBLISHED".equals(rule.getStatus()));
        result.put("canUnpublish", "PUBLISHED".equals(rule.getStatus()) && formalTaskCount == 0);
        if ("PUBLISHED".equals(rule.getStatus())) {
            result.put("editBlockReason", "已发布的规则不可编辑，请先撤销发布或复制为新规则");
            result.put("deleteBlockReason", "已发布的规则不可删除，请先撤销发布");
            if (formalTaskCount > 0) {
                result.put("unpublishBlockReason", "被 " + formalTaskCount + " 个正式任务引用，不可撤销发布");
            }
        }
        return toJson(result);
    }

    private String checkEmployee(Long employeeId) {
        Employee employee = new Employee();
        // 直接查 mapper
        var emp = tagResultMapper.selectList(
                new LambdaQueryWrapper<EmployeeTagResult>().eq(EmployeeTagResult::getEmployeeId, employeeId));

        long totalResults = emp.size();
        long activeResults = emp.stream().filter(r -> Boolean.TRUE.equals(r.getValidFlag())).count();

        // 按规则分组
        Map<Long, Long> ruleHits = emp.stream()
                .filter(r -> Boolean.TRUE.equals(r.getValidFlag()))
                .collect(Collectors.groupingBy(EmployeeTagResult::getSourceRuleId, Collectors.counting()));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("objectType", "employee");
        result.put("objectId", employeeId);
        result.put("totalResultCount", totalResults);
        result.put("activeTagCount", activeResults);
        result.put("sourceRuleCount", ruleHits.size());
        return toJson(result);
    }

    private String toJson(Object obj) {
        try { return objectMapper.writeValueAsString(obj); }
        catch (Exception e) { return "{\"error\":\"JSON序列化失败\"}"; }
    }
}
