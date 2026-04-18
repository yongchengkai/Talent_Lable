package com.talent.label.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.talent.label.common.BizException;
import com.talent.label.domain.entity.TagCategory;
import com.talent.label.mapper.TagCategoryMapper;
import com.talent.label.service.TagCategoryService;
import com.talent.label.service.TagDefinitionService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TagCategoryServiceImpl implements TagCategoryService {

    private final TagCategoryMapper categoryMapper;
    @Lazy
    private final TagDefinitionService tagDefinitionService;

    @Override
    public Page<TagCategory> page(int current, int size, String keyword, String status) {
        LambdaQueryWrapper<TagCategory> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(keyword)) {
            wrapper.and(w -> w.like(TagCategory::getCategoryName, keyword)
                    .or().like(TagCategory::getCategoryCode, keyword));
        }
        if (StringUtils.hasText(status)) {
            wrapper.eq(TagCategory::getStatus, status);
        }
        wrapper.orderByAsc(TagCategory::getSortOrder).orderByDesc(TagCategory::getCreatedAt);
        Page<TagCategory> page = categoryMapper.selectPage(new Page<>(current, size), wrapper);
        // 填充每个类目的标签数量
        for (TagCategory cat : page.getRecords()) {
            long total = tagDefinitionService.countByCategoryId(cat.getId());
            long active = tagDefinitionService.countByCategoryIdAndStatus(cat.getId(), "ACTIVE");
            cat.setTagCount(total);
            cat.setActiveTagCount(active);
            cat.setInactiveTagCount(total - active);
        }
        return page;
    }

    @Override
    public TagCategory getById(Long id) {
        TagCategory cat = categoryMapper.selectById(id);
        if (cat == null) throw new BizException("类目不存在");
        long total = tagDefinitionService.countByCategoryId(id);
        long active = tagDefinitionService.countByCategoryIdAndStatus(id, "ACTIVE");
        cat.setTagCount(total);
        cat.setActiveTagCount(active);
        cat.setInactiveTagCount(total - active);
        return cat;
    }

    @Override
    public TagCategory create(TagCategory category) {
        // 编码唯一性校验
        LambdaQueryWrapper<TagCategory> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(TagCategory::getCategoryCode, category.getCategoryCode().toUpperCase());
        if (categoryMapper.selectCount(wrapper) > 0) {
            throw new BizException("类目编码已存在");
        }
        category.setCategoryCode(category.getCategoryCode().toUpperCase());
        category.setStatus("ACTIVE");
        categoryMapper.insert(category);
        return category;
    }

    @Override
    public TagCategory update(Long id, TagCategory category) {
        TagCategory existing = getById(id);
        // 编码不可修改
        existing.setCategoryName(category.getCategoryName());
        existing.setDescription(category.getDescription());
        existing.setSortOrder(category.getSortOrder());
        existing.setUpdatedBy(category.getUpdatedBy());
        categoryMapper.updateById(existing);
        return existing;
    }

    @Override
    public void updateStatus(Long id, String status) {
        TagCategory cat = getById(id);
        if ("INACTIVE".equals(status)) {
            long activeCount = tagDefinitionService.countByCategoryIdAndStatus(id, "ACTIVE");
            if (activeCount > 0) {
                throw new BizException("类目下仍有 " + activeCount + " 个启用标签，请先停用或迁移标签后再停用类目");
            }
        }
        cat.setStatus(status);
        categoryMapper.updateById(cat);
    }

    @Override
    public void delete(Long id) {
        long tagCount = tagDefinitionService.countByCategoryId(id);
        if (tagCount > 0) {
            throw new BizException("类目下仍有标签，无法删除");
        }
        categoryMapper.deleteById(id);
    }

    @Override
    public List<TagCategory> listActive() {
        LambdaQueryWrapper<TagCategory> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(TagCategory::getStatus, "ACTIVE")
                .orderByAsc(TagCategory::getSortOrder);
        return categoryMapper.selectList(wrapper);
    }
}
