package com.talent.label.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.talent.label.domain.entity.TagRule;

import java.util.List;
import java.util.Map;

public interface TagRuleService {
    Page<TagRule> page(int current, int size, String keyword, String status, String ruleType);
    TagRule getById(Long id);
    TagRule create(TagRule rule);
    TagRule update(Long id, TagRule rule);
    void publish(Long id);
    void stop(Long id);
    void rollback(Long id);
    List<Map<String, Object>> getFormalTasks(Long id);
    TagRule copy(Long id);
    void delete(Long id);
}
