package com.talent.label.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.talent.label.common.BizException;
import com.talent.label.domain.entity.EmployeeTagResult;
import com.talent.label.domain.entity.EmployeeTagResultDetail;
import com.talent.label.domain.entity.TagDefinition;
import com.talent.label.domain.entity.TagRule;
import com.talent.label.domain.entity.TagRuleOutput;
import com.talent.label.mapper.EmployeeTagResultDetailMapper;
import com.talent.label.mapper.EmployeeTagResultMapper;
import com.talent.label.mapper.TagDefinitionMapper;
import com.talent.label.mapper.TagRuleMapper;
import com.talent.label.mapper.TagRuleOutputMapper;
import com.talent.label.service.TagDefinitionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.*;

@Service
@RequiredArgsConstructor
public class TagDefinitionServiceImpl implements TagDefinitionService {

    private final TagDefinitionMapper tagMapper;
    private final TagRuleOutputMapper ruleOutputMapper;
    private final TagRuleMapper ruleMapper;
    private final EmployeeTagResultMapper tagResultMapper;
    private final EmployeeTagResultDetailMapper tagResultDetailMapper;

    @Override
    public Page<TagDefinition> page(int current, int size, String keyword, String status, Long categoryId) {
        LambdaQueryWrapper<TagDefinition> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(keyword)) {
            wrapper.and(w -> w.like(TagDefinition::getTagName, keyword)
                    .or().like(TagDefinition::getTagCode, keyword));
        }
        if (StringUtils.hasText(status)) {
            wrapper.eq(TagDefinition::getStatus, status);
        }
        if (categoryId != null) {
            wrapper.eq(TagDefinition::getCategoryId, categoryId);
        }
        wrapper.orderByAsc(TagDefinition::getSortOrder).orderByDesc(TagDefinition::getCreatedAt);
        return tagMapper.selectPage(new Page<>(current, size), wrapper);
    }

    @Override
    public TagDefinition getById(Long id) {
        TagDefinition tag = tagMapper.selectById(id);
        if (tag == null) throw new BizException("标签不存在");
        return tag;
    }

    @Override
    public TagDefinition create(TagDefinition tag) {
        String code = tag.getTagCode().toUpperCase();
        if (!code.startsWith("TAG_")) {
            throw new BizException("标签编码必须以 TAG_ 开头");
        }
        String suffix = code.substring(4);
        if (suffix.length() < 2 || suffix.length() > 60) {
            throw new BizException("标签编码后缀长度需在 2-60 之间");
        }
        if (!suffix.matches("^[A-Z0-9_]+$")) {
            throw new BizException("标签编码后缀仅允许大写字母、数字和下划线");
        }
        LambdaQueryWrapper<TagDefinition> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(TagDefinition::getTagCode, code);
        if (tagMapper.selectCount(wrapper) > 0) {
            throw new BizException("标签编码已存在");
        }
        tag.setTagCode(code);
        tag.setStatus("ACTIVE");
        tagMapper.insert(tag);
        return tag;
    }

    @Override
    public TagDefinition update(Long id, TagDefinition tag) {
        TagDefinition existing = getById(id);
        existing.setTagName(tag.getTagName());
        existing.setDescription(tag.getDescription());
        existing.setTagSource(tag.getTagSource());
        existing.setSortOrder(tag.getSortOrder());
        existing.setUpdatedBy(tag.getUpdatedBy());
        tagMapper.updateById(existing);
        return existing;
    }

    @Override
    public void updateStatus(Long id, String status) {
        TagDefinition tag = getById(id);
        if ("INACTIVE".equals(status)) {
            long ruleRefCount = countRuleReferences(tag);
            if (ruleRefCount > 0) {
                throw new BizException("标签被 " + ruleRefCount + " 条规则引用，无法停用。请先移除规则中对该标签的引用后再操作");
            }
        }
        tag.setStatus(status);
        tagMapper.updateById(tag);
    }

    @Override
    public void delete(Long id) {
        TagDefinition tag = getById(id);
        long ruleRefCount = countRuleReferences(tag);
        if (ruleRefCount > 0) {
            throw new BizException("标签被规则引用，无法删除");
        }

        long historyRefCount = countHistoryReferences(tag.getId());
        if (historyRefCount > 0) {
            throw new BizException("标签存在历史打标结果，无法删除");
        }

        tagMapper.deleteById(id);
    }

    private long countRuleReferences(TagDefinition tag) {
        Long outputRefCount = ruleOutputMapper.selectCount(
                new LambdaQueryWrapper<TagRuleOutput>().eq(TagRuleOutput::getTagId, tag.getId()));

        String pattern = "（" + tag.getTagCode() + "）";
        Long dslRefCount = ruleMapper.selectCount(
                new LambdaQueryWrapper<TagRule>()
                        .like(TagRule::getDslContent, pattern));

        return nullToZero(outputRefCount) + nullToZero(dslRefCount);
    }

    private long countHistoryReferences(Long tagId) {
        Long resultRefCount = tagResultMapper.selectCount(
                new LambdaQueryWrapper<EmployeeTagResult>().eq(EmployeeTagResult::getTagId, tagId));
        Long detailRefCount = tagResultDetailMapper.selectCount(
                new LambdaQueryWrapper<EmployeeTagResultDetail>().eq(EmployeeTagResultDetail::getTagId, tagId));
        return nullToZero(resultRefCount) + nullToZero(detailRefCount);
    }

    private long nullToZero(Long value) {
        return value == null ? 0L : value;
    }

    @Override
    @Transactional
    public void migrate(List<Long> tagIds, Long targetCategoryId) {
        for (Long tagId : tagIds) {
            TagDefinition tag = getById(tagId);
            tag.setCategoryId(targetCategoryId);
            tagMapper.updateById(tag);
        }
    }

    @Override
    public long countByCategoryId(Long categoryId) {
        LambdaQueryWrapper<TagDefinition> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(TagDefinition::getCategoryId, categoryId);
        return tagMapper.selectCount(wrapper);
    }

    @Override
    public long countByCategoryIdAndStatus(Long categoryId, String status) {
        LambdaQueryWrapper<TagDefinition> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(TagDefinition::getCategoryId, categoryId)
               .eq(TagDefinition::getStatus, status);
        return tagMapper.selectCount(wrapper);
    }

    @Override
    public List<Map<String, Object>> getReferencingRules(Long tagId) {
        TagDefinition tag = getById(tagId);
        Set<Long> ruleIds = new LinkedHashSet<>();

        // 1. 通过 tag_rule_output 表查（条件打标规则）
        List<TagRuleOutput> outputs = ruleOutputMapper.selectList(
                new LambdaQueryWrapper<TagRuleOutput>().eq(TagRuleOutput::getTagId, tagId));
        for (TagRuleOutput o : outputs) ruleIds.add(o.getRuleId());

        // 2. 通过 dslContent 中 #{标签名（标签编码）} 匹配（所有规则类型）
        String pattern = "（" + tag.getTagCode() + "）";
        List<TagRule> dslRules = ruleMapper.selectList(
                new LambdaQueryWrapper<TagRule>()
                        .like(TagRule::getDslContent, pattern));
        for (TagRule r : dslRules) ruleIds.add(r.getId());

        if (ruleIds.isEmpty()) return List.of();

        List<TagRule> rules = ruleMapper.selectBatchIds(ruleIds);
        List<Map<String, Object>> result = new ArrayList<>();
        for (TagRule rule : rules) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("ruleId", rule.getId());
            m.put("ruleName", rule.getRuleName());
            m.put("ruleCode", rule.getRuleCode());
            m.put("ruleType", rule.getRuleType());
            m.put("status", rule.getStatus());
            result.add(m);
        }
        return result;
    }
}
