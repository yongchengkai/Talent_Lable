package com.talent.label.ai.tools;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.talent.label.domain.entity.TagCategory;
import com.talent.label.domain.entity.TagDefinition;
import com.talent.label.mapper.TagCategoryMapper;
import com.talent.label.mapper.TagDefinitionMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.*;
import java.util.function.Function;

@Slf4j
@Component("searchTags")
@RequiredArgsConstructor
public class SearchTagsTool implements Function<SearchTagsTool.Request, String> {

    private final TagDefinitionMapper tagDefinitionMapper;
    private final TagCategoryMapper tagCategoryMapper;
    private final ObjectMapper objectMapper;

    public record Request(
            @JsonProperty("keyword") @JsonPropertyDescription("搜索关键词，匹配标签名称或编码") String keyword,
            @JsonProperty("categoryId") @JsonPropertyDescription("标签类目ID") Long categoryId,
            @JsonProperty("status") @JsonPropertyDescription("状态: ACTIVE/INACTIVE") String status
    ) {}

    @Override
    public String apply(Request request) {
        try {
            LambdaQueryWrapper<TagDefinition> wrapper = new LambdaQueryWrapper<>();
            if (StringUtils.hasText(request.keyword())) {
                wrapper.and(w -> w.like(TagDefinition::getTagName, request.keyword())
                        .or().like(TagDefinition::getTagCode, request.keyword()));
            }
            if (request.categoryId() != null) {
                wrapper.eq(TagDefinition::getCategoryId, request.categoryId());
            }
            if (StringUtils.hasText(request.status())) {
                wrapper.eq(TagDefinition::getStatus, request.status());
            }
            wrapper.orderByAsc(TagDefinition::getSortOrder);

            Page<TagDefinition> page = tagDefinitionMapper.selectPage(new Page<>(1, 30), wrapper);

            // 查询类目映射
            Map<Long, String> categoryMap = new HashMap<>();
            List<TagCategory> categories = tagCategoryMapper.selectList(new LambdaQueryWrapper<>());
            for (TagCategory cat : categories) {
                categoryMap.put(cat.getId(), cat.getCategoryName());
            }

            List<Map<String, Object>> results = new ArrayList<>();
            for (TagDefinition tag : page.getRecords()) {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("id", tag.getId());
                item.put("tagCode", tag.getTagCode());
                item.put("tagName", tag.getTagName());
                item.put("tagSource", tag.getTagSource());
                item.put("categoryName", categoryMap.getOrDefault(tag.getCategoryId(), "未知"));
                item.put("status", tag.getStatus());
                item.put("description", tag.getDescription());
                results.add(item);
            }

            Map<String, Object> response = new LinkedHashMap<>();
            response.put("total", page.getTotal());
            response.put("tags", results);
            return objectMapper.writeValueAsString(response);
        } catch (Exception e) {
            log.error("搜索标签失败", e);
            return "{\"error\": \"搜索标签失败: " + e.getMessage() + "\"}";
        }
    }
}
