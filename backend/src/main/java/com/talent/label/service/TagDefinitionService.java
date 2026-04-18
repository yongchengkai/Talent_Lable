package com.talent.label.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.talent.label.domain.entity.TagDefinition;

import java.util.List;
import java.util.Map;

public interface TagDefinitionService {
    Page<TagDefinition> page(int current, int size, String keyword, String status, Long categoryId);
    TagDefinition getById(Long id);
    TagDefinition create(TagDefinition tag);
    TagDefinition update(Long id, TagDefinition tag);
    void updateStatus(Long id, String status);
    void delete(Long id);
    void migrate(List<Long> tagIds, Long targetCategoryId);
    long countByCategoryId(Long categoryId);
    long countByCategoryIdAndStatus(Long categoryId, String status);
    List<Map<String, Object>> getReferencingRules(Long tagId);
}
