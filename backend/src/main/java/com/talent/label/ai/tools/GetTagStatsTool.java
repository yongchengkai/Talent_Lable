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
@Component("getTagStats")
@RequiredArgsConstructor
public class GetTagStatsTool implements Function<GetTagStatsTool.Request, String> {

    private final TagDefinitionMapper tagDefinitionMapper;
    private final TagCategoryMapper tagCategoryMapper;
    private final EmployeeTagResultMapper resultMapper;
    private final EmployeeMapper employeeMapper;
    private final TagDefinitionService tagDefinitionService;
    private final ObjectMapper objectMapper;

    public record Request(
            @JsonProperty("categoryId") @JsonPropertyDescription("按类目ID筛选统计") Long categoryId
    ) {}

    @Override
    public String apply(Request request) {
        try {
            // 查询标签定义
            LambdaQueryWrapper<TagDefinition> tagWrapper = new LambdaQueryWrapper<>();
            if (request.categoryId() != null) {
                tagWrapper.eq(TagDefinition::getCategoryId, request.categoryId());
            }
            tagWrapper.eq(TagDefinition::getStatus, "ACTIVE");
            List<TagDefinition> tags = tagDefinitionMapper.selectList(tagWrapper);

            // 查询类目映射
            Map<Long, String> categoryMap = new HashMap<>();
            List<TagCategory> categories = tagCategoryMapper.selectList(new LambdaQueryWrapper<>());
            for (TagCategory cat : categories) {
                categoryMap.put(cat.getId(), cat.getCategoryName());
            }

            Long totalEmployees = employeeMapper.selectCount(new LambdaQueryWrapper<>());

            // 统计每个标签的覆盖人数
            List<Map<String, Object>> stats = new ArrayList<>();
            List<Map<String, Object>> unreferencedTags = new ArrayList<>();
            for (TagDefinition tag : tags) {
                Long hitCount = resultMapper.selectCount(
                        new LambdaQueryWrapper<EmployeeTagResult>()
                                .eq(EmployeeTagResult::getTagId, tag.getId())
                                .eq(EmployeeTagResult::getValidFlag, true));
                List<Map<String, Object>> referencingRules = tagDefinitionService.getReferencingRules(tag.getId());
                int referencingRuleCount = referencingRules.size();
                boolean referencedByRule = referencingRuleCount > 0;

                Map<String, Object> item = new LinkedHashMap<>();
                item.put("tagName", tag.getTagName());
                item.put("tagCode", tag.getTagCode());
                item.put("categoryName", categoryMap.getOrDefault(tag.getCategoryId(), "未知"));
                item.put("hitCount", hitCount);
                item.put("referencingRuleCount", referencingRuleCount);
                item.put("referencedByRule", referencedByRule);
                item.put("coverageRate",
                        totalEmployees > 0 ? String.format("%.1f%%", hitCount * 100.0 / totalEmployees) : "0%");
                stats.add(item);

                if (!referencedByRule) {
                    Map<String, Object> unref = new LinkedHashMap<>();
                    unref.put("tagName", tag.getTagName());
                    unref.put("tagCode", tag.getTagCode());
                    unref.put("categoryName", categoryMap.getOrDefault(tag.getCategoryId(), "未知"));
                    unreferencedTags.add(unref);
                }
            }

            // 按类目汇总
            Map<String, Long> categoryStats = new LinkedHashMap<>();
            for (Map<String, Object> s : stats) {
                String catName = (String) s.get("categoryName");
                Long count = (Long) s.get("hitCount");
                categoryStats.merge(catName, count, Long::sum);
            }

            Map<String, Object> response = new LinkedHashMap<>();
            response.put("totalEmployees", totalEmployees);
            response.put("totalTags", tags.size());
            response.put("referencedTagCount", tags.size() - unreferencedTags.size());
            response.put("unreferencedTagCount", unreferencedTags.size());
            response.put("unreferencedTags", unreferencedTags);
            response.put("tagDetails", stats);
            response.put("categorySummary", categoryStats);
            return objectMapper.writeValueAsString(response);
        } catch (Exception e) {
            log.error("标签统计失败", e);
            return "{\"error\": \"标签统计失败: " + e.getMessage() + "\"}";
        }
    }
}
