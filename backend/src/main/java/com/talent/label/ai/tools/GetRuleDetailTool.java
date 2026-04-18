package com.talent.label.ai.tools;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.talent.label.domain.entity.*;
import com.talent.label.mapper.*;
import com.talent.label.mapper.TagDefinitionMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.function.Function;

@Slf4j
@Component("getRuleDetail")
@RequiredArgsConstructor
public class GetRuleDetailTool implements Function<GetRuleDetailTool.Request, String> {

    private final TagRuleMapper tagRuleMapper;
    private final TagRuleConditionMapper conditionMapper;
    private final TagRuleOutputMapper outputMapper;
    private final TagRuleScopeMapper scopeMapper;
    private final TagRuleBranchMapper branchMapper;
    private final TagDefinitionMapper tagDefinitionMapper;
    private final ObjectMapper objectMapper;

    public record Request(
            @JsonProperty("ruleId") @JsonPropertyDescription("规则ID") Long ruleId
    ) {}

    @Override
    public String apply(Request request) {
        try {
            TagRule rule = tagRuleMapper.selectById(request.ruleId());
            if (rule == null) {
                return "{\"error\": \"规则不存在，ID: " + request.ruleId() + "\"}";
            }

            Map<String, Object> detail = new LinkedHashMap<>();
            detail.put("id", rule.getId());
            detail.put("ruleCode", rule.getRuleCode());
            detail.put("ruleName", rule.getRuleName());
            detail.put("ruleType", rule.getRuleType());
            detail.put("status", rule.getStatus());
            detail.put("priority", rule.getPriority());
            detail.put("versionNo", rule.getVersionNo());
            detail.put("originRuleId", rule.getOriginRuleId());
            detail.put("dslContent", rule.getDslContent());
            detail.put("dslExplain", rule.getDslExplain());

            // 查询分支
            List<TagRuleBranch> branches = branchMapper.selectList(
                    new LambdaQueryWrapper<TagRuleBranch>().eq(TagRuleBranch::getRuleId, rule.getId()));
            List<Map<String, Object>> branchList = new ArrayList<>();
            for (TagRuleBranch branch : branches) {
                Map<String, Object> b = new LinkedHashMap<>();
                b.put("id", branch.getId());
                b.put("branchName", branch.getBranchName());
                b.put("sortOrder", branch.getSortOrder());

                // 查询该分支的条件
                List<TagRuleCondition> conditions = conditionMapper.selectList(
                        new LambdaQueryWrapper<TagRuleCondition>()
                                .eq(TagRuleCondition::getRuleId, rule.getId())
                                .eq(TagRuleCondition::getBranchId, branch.getId()));
                List<Map<String, Object>> condList = new ArrayList<>();
                for (TagRuleCondition c : conditions) {
                    Map<String, Object> cm = new LinkedHashMap<>();
                    cm.put("fieldCode", c.getFieldCode());
                    cm.put("fieldName", c.getFieldName());
                    cm.put("operator", c.getOperator());
                    cm.put("valueExpr", c.getValueExpr());
                    condList.add(cm);
                }
                b.put("conditions", condList);

                // 查询该分支的输出标签
                List<TagRuleOutput> outputs = outputMapper.selectList(
                        new LambdaQueryWrapper<TagRuleOutput>()
                                .eq(TagRuleOutput::getRuleId, rule.getId())
                                .eq(TagRuleOutput::getBranchId, branch.getId()));
                List<Map<String, Object>> outList = new ArrayList<>();
                for (TagRuleOutput o : outputs) {
                    Map<String, Object> om = new LinkedHashMap<>();
                    om.put("tagId", o.getTagId());
                    // 通过 tagId 查询标签定义获取 code 和 name
                    TagDefinition tagDef = tagDefinitionMapper.selectById(o.getTagId());
                    if (tagDef != null) {
                        om.put("tagCode", tagDef.getTagCode());
                        om.put("tagName", tagDef.getTagName());
                    }
                    outList.add(om);
                }
                b.put("outputTags", outList);
                branchList.add(b);
            }
            detail.put("branches", branchList);

            // 查询适用范围
            List<TagRuleScope> scopes = scopeMapper.selectList(
                    new LambdaQueryWrapper<TagRuleScope>().eq(TagRuleScope::getRuleId, rule.getId()));
            List<Map<String, Object>> scopeList = new ArrayList<>();
            for (TagRuleScope s : scopes) {
                Map<String, Object> sm = new LinkedHashMap<>();
                sm.put("scopeType", s.getScopeType());
                sm.put("scopeValue", s.getScopeValue());
                sm.put("scopeName", s.getScopeName());
                scopeList.add(sm);
            }
            detail.put("scopes", scopeList);

            return objectMapper.writeValueAsString(detail);
        } catch (Exception e) {
            log.error("获取规则详情失败", e);
            return "{\"error\": \"获取规则详情失败: " + e.getMessage() + "\"}";
        }
    }
}
