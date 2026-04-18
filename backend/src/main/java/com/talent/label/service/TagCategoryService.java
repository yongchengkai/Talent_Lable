package com.talent.label.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.talent.label.domain.entity.TagCategory;

import java.util.List;

public interface TagCategoryService {
    Page<TagCategory> page(int current, int size, String keyword, String status);
    TagCategory getById(Long id);
    TagCategory create(TagCategory category);
    TagCategory update(Long id, TagCategory category);
    void updateStatus(Long id, String status);
    void delete(Long id);
    List<TagCategory> listActive();
}
