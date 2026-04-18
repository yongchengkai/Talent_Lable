package com.talent.label.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.talent.label.domain.entity.TagRule;

public interface TagRuleService {
    Page<TagRule> page(int current, int size, String keyword, String status, String ruleType);
    TagRule getById(Long id);
    TagRule create(TagRule rule);
    TagRule update(Long id, TagRule rule);
    void publish(Long id);
    void stop(Long id);
    TagRule copy(Long id);
    void delete(Long id);
}
