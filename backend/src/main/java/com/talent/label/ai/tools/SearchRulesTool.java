package com.talent.label.ai.tools;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.talent.label.domain.entity.TagRule;
import com.talent.label.mapper.TagRuleMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.*;
import java.util.function.Function;

@Slf4j
@Component("searchRules")
@RequiredArgsConstructor
public class SearchRulesTool implements Function<SearchRulesTool.Request, String> {

    private final TagRuleMapper tagRuleMapper;
    private final ObjectMapper objectMapper;

    public record Request(
            @JsonProperty("keyword") @JsonPropertyDescription("搜索关键词，匹配规则名称或编码") String keyword,
            @JsonProperty("status") @JsonPropertyDescription("规则状态过滤: UNPUBLISHED/PUBLISHED") String status,
            @JsonProperty("ruleType") @JsonPropertyDescription("规则类型: STRUCTURED/AI_SEMANTIC") String ruleType
    ) {}

    @Override
    public String apply(Request request) {
        try {
            LambdaQueryWrapper<TagRule> wrapper = new LambdaQueryWrapper<>();
            if (StringUtils.hasText(request.keyword())) {
                wrapper.and(w -> w.like(TagRule::getRuleName, request.keyword())
                        .or().like(TagRule::getRuleCode, request.keyword())
                        .or().like(TagRule::getDslExplain, request.keyword()));
            }
            if (StringUtils.hasText(request.status())) {
                wrapper.eq(TagRule::getStatus, request.status());
            }
            if (StringUtils.hasText(request.ruleType())) {
                wrapper.eq(TagRule::getRuleType, request.ruleType());
            }
            wrapper.orderByDesc(TagRule::getUpdatedAt);

            Page<TagRule> page = tagRuleMapper.selectPage(new Page<>(1, 20), wrapper);
            List<Map<String, Object>> results = new ArrayList<>();
            for (TagRule rule : page.getRecords()) {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("id", rule.getId());
                item.put("ruleCode", rule.getRuleCode());
                item.put("ruleName", rule.getRuleName());
                item.put("ruleType", rule.getRuleType());
                item.put("status", rule.getStatus());
                item.put("priority", rule.getPriority());
                item.put("versionNo", rule.getVersionNo());
                item.put("dslExplain", rule.getDslExplain());
                results.add(item);
            }

            Map<String, Object> response = new LinkedHashMap<>();
            response.put("total", page.getTotal());
            response.put("rules", results);
            return objectMapper.writeValueAsString(response);
        } catch (Exception e) {
            log.error("搜索规则失败", e);
            return "{\"error\": \"搜索规则失败: " + e.getMessage() + "\"}";
        }
    }
}
