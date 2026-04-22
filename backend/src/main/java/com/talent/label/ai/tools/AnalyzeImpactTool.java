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

@Slf4j
@Component("analyzeImpact")
@RequiredArgsConstructor
public class AnalyzeImpactTool implements Function<AnalyzeImpactTool.Request, String> {

    private final TagCategoryMapper categoryMapper;
    private final TagDefinitionMapper tagDefinitionMapper;
    private final TagRuleMapper ruleMapper;
    private final TagRuleOutputMapper outputMapper;
    private final CalcTaskRuleMapper taskRuleMapper;
    private final CalcTaskMapper taskMapper;
    private final EmployeeTagResultMapper tagResultMapper;
    private final TagDefinitionService tagDefinitionService;
    private final ObjectMapper objectMapper;

    public record Request(
            @JsonProperty("operation") @JsonPropertyDescription("要分析的操作：disableCategory/deleteCategory/disableTag/deleteTag/unpublishRule/deleteRule/modifyRule") String operation,
            @JsonProperty("objectId") @JsonPropertyDescription("目标对象ID") Long objectId
    ) {}

    @Override
    public String apply(Request req) {
        try {
            return switch (req.operation()) {
                case "disableCategory" -> analyzeDisableCategory(req.objectId());
                case "deleteCategory" -> analyzeDeleteCategory(req.objectId());
                case "disableTag" -> analyzeDisableTag(req.objectId());
                case "deleteTag" -> analyzeDeleteTag(req.objectId());
                case "unpublishRule" -> analyzeUnpublishRule(req.objectId());
                case "deleteRule" -> analyzeDeleteRule(req.objectId());
                case "modifyRule" -> analyzeModifyRule(req.objectId());
                default -> toJson(Map.of("error", "不支持的操作: " + req.operation()));
            };
        } catch (Exception e) {
            return toJson(Map.of("error", e.getMessage()));
        }
    }

    private String analyzeDisableCategory(Long categoryId) {
        TagCategory category = categoryMapper.selectById(categoryId);
        if (category == null) return toJson(Map.of("error", "类目不存在"));

        long activeTags = tagDefinitionMapper.selectCount(
                new LambdaQueryWrapper<TagDefinition>()
                        .eq(TagDefinition::getCategoryId, categoryId)
                        .eq(TagDefinition::getStatus, "ACTIVE"));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("operation", "disableCategory");
        result.put("target", category.getCategoryName());
        result.put("feasible", activeTags == 0);
        if (activeTags > 0) {
            result.put("blockReason", "类目下还有 " + activeTags + " 个启用标签");
            result.put("suggestion", "请先将这些标签停用或迁移到其他类目，再停用此类目");
        } else {
            result.put("impact", "停用后该类目不再承载新标签，已有标签不受影响");
        }
        return toJson(result);
    }

    private String analyzeDeleteCategory(Long categoryId) {
        TagCategory category = categoryMapper.selectById(categoryId);
        if (category == null) return toJson(Map.of("error", "类目不存在"));

        long totalTags = tagDefinitionMapper.selectCount(
                new LambdaQueryWrapper<TagDefinition>().eq(TagDefinition::getCategoryId, categoryId));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("operation", "deleteCategory");
        result.put("target", category.getCategoryName());
        result.put("feasible", totalTags == 0);
        if (totalTags > 0) {
            result.put("blockReason", "类目下还有 " + totalTags + " 个标签");
            result.put("suggestion", "请先将所有标签迁移到其他类目或删除，再删除此类目");
        } else {
            result.put("impact", "类目将被永久删除，不可恢复");
        }
        return toJson(result);
    }

    private String analyzeDisableTag(Long tagId) {
        TagDefinition tag = tagDefinitionMapper.selectById(tagId);
        if (tag == null) return toJson(Map.of("error", "标签不存在"));

        List<Map<String, Object>> rules = tagDefinitionService.getReferencingRules(tagId);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("operation", "disableTag");
        result.put("target", tag.getTagName() + "(" + tag.getTagCode() + ")");
        result.put("feasible", rules.isEmpty());
        if (!rules.isEmpty()) {
            result.put("blockReason", "被 " + rules.size() + " 条规则引用");
            result.put("referencingRules", rules);
            result.put("suggestion", "请先修改这些规则移除对该标签的引用，再停用");
        } else {
            result.put("impact", "停用后该标签不再出现在规则编辑的标签选择面板中，已有规则引用不受影响");
        }
        return toJson(result);
    }

    private String analyzeDeleteTag(Long tagId) {
        TagDefinition tag = tagDefinitionMapper.selectById(tagId);
        if (tag == null) return toJson(Map.of("error", "标签不存在"));

        List<Map<String, Object>> rules = tagDefinitionService.getReferencingRules(tagId);
        long resultCount = tagResultMapper.selectCount(
                new LambdaQueryWrapper<EmployeeTagResult>().eq(EmployeeTagResult::getTagId, tagId));

        boolean hasRuleRef = !rules.isEmpty();
        boolean hasResultRef = resultCount > 0;

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("operation", "deleteTag");
        result.put("target", tag.getTagName() + "(" + tag.getTagCode() + ")");
        result.put("feasible", !hasRuleRef && !hasResultRef);
        List<String> reasons = new ArrayList<>();
        if (hasRuleRef) reasons.add("被 " + rules.size() + " 条规则引用");
        if (hasResultRef) reasons.add("存在 " + resultCount + " 条历史打标结果");
        if (!reasons.isEmpty()) {
            result.put("blockReason", String.join("；", reasons));
            result.put("suggestion", "请先处理引用关系和历史结果后再删除");
        } else {
            result.put("impact", "标签将被永久删除，不可恢复");
        }
        return toJson(result);
    }

    private String analyzeUnpublishRule(Long ruleId) {
        TagRule rule = ruleMapper.selectById(ruleId);
        if (rule == null) return toJson(Map.of("error", "规则不存在"));

        // 检查正式任务引用
        List<CalcTaskRule> taskRules = taskRuleMapper.selectList(
                new LambdaQueryWrapper<CalcTaskRule>().eq(CalcTaskRule::getRuleId, ruleId));
        long formalCount = 0;
        if (!taskRules.isEmpty()) {
            List<Long> taskIds = taskRules.stream().map(CalcTaskRule::getTaskId).toList();
            formalCount = taskMapper.selectCount(
                    new LambdaQueryWrapper<CalcTask>()
                            .in(CalcTask::getId, taskIds)
                            .eq(CalcTask::getTaskMode, "FORMAL"));
        }

        // 有效标签结果
        long activeResults = tagResultMapper.selectCount(
                new LambdaQueryWrapper<EmployeeTagResult>()
                        .eq(EmployeeTagResult::getSourceRuleId, ruleId)
                        .eq(EmployeeTagResult::getValidFlag, true));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("operation", "unpublishRule");
        result.put("target", rule.getRuleName() + "(" + rule.getRuleCode() + ")");
        result.put("feasible", formalCount == 0);
        if (formalCount > 0) {
            result.put("blockReason", "被 " + formalCount + " 个正式任务引用，不可撤销");
            result.put("suggestion", "请先处理关联的正式任务后再撤销发布");
        } else {
            List<String> impacts = new ArrayList<>();
            impacts.add("规则将退出生产，不再参与后续打标");
            if (activeResults > 0) {
                impacts.add(activeResults + " 条有效标签结果将被失效（validFlag 置为 false）");
            }
            result.put("impact", impacts);
            result.put("activeResultCount", activeResults);
        }
        return toJson(result);
    }

    private String analyzeDeleteRule(Long ruleId) {
        TagRule rule = ruleMapper.selectById(ruleId);
        if (rule == null) return toJson(Map.of("error", "规则不存在"));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("operation", "deleteRule");
        result.put("target", rule.getRuleName() + "(" + rule.getRuleCode() + ")");
        result.put("feasible", !"PUBLISHED".equals(rule.getStatus()));
        if ("PUBLISHED".equals(rule.getStatus())) {
            result.put("blockReason", "已发布的规则不可删除");
            result.put("suggestion", "请先撤销发布后再删除");
        } else {
            result.put("impact", "规则将被永久删除，不可恢复");
        }
        return toJson(result);
    }

    private String analyzeModifyRule(Long ruleId) {
        TagRule rule = ruleMapper.selectById(ruleId);
        if (rule == null) return toJson(Map.of("error", "规则不存在"));

        // 检查正式任务使用情况
        List<CalcTaskRule> taskRules = taskRuleMapper.selectList(
                new LambdaQueryWrapper<CalcTaskRule>().eq(CalcTaskRule::getRuleId, ruleId));
        long blockedCount = 0;
        if (!taskRules.isEmpty()) {
            List<Long> taskIds = taskRules.stream().map(CalcTaskRule::getTaskId).toList();
            blockedCount = taskMapper.selectCount(
                    new LambdaQueryWrapper<CalcTask>()
                            .in(CalcTask::getId, taskIds)
                            .eq(CalcTask::getTaskMode, "FORMAL")
                            .in(CalcTask::getTaskStatus, List.of("RUNNING", "SUCCESS")));
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("operation", "modifyRule");
        result.put("target", rule.getRuleName() + "(" + rule.getRuleCode() + ")");

        if ("PUBLISHED".equals(rule.getStatus())) {
            result.put("feasible", false);
            result.put("blockReason", "已发布的规则不可直接编辑");
            result.put("suggestion", "请先撤销发布后编辑，或复制为新规则后修改");
        } else if (blockedCount > 0) {
            result.put("feasible", false);
            result.put("blockReason", "被 " + blockedCount + " 个正式任务使用（运行中或已成功）");
            result.put("suggestion", "请先撤销相关任务后再编辑，或复制为新规则后修改");
        } else {
            result.put("feasible", true);
            result.put("impact", "规则可以直接编辑，修改后需重新发布才能参与正式打标");
        }
        return toJson(result);
    }

    private String toJson(Object obj) {
        try { return objectMapper.writeValueAsString(obj); }
        catch (Exception e) { return "{\"error\":\"JSON序列化失败\"}"; }
    }
}
