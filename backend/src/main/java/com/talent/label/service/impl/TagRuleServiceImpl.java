package com.talent.label.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.talent.label.common.BizException;
import com.talent.label.domain.entity.TagRule;
import com.talent.label.mapper.TagRuleMapper;
import com.talent.label.service.TagRuleService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class TagRuleServiceImpl implements TagRuleService {

    private final TagRuleMapper ruleMapper;

    @Override
    public Page<TagRule> page(int current, int size, String keyword, String status, String ruleType) {
        LambdaQueryWrapper<TagRule> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(keyword)) {
            wrapper.and(w -> w.like(TagRule::getRuleName, keyword)
                    .or().like(TagRule::getRuleCode, keyword));
        }
        if (StringUtils.hasText(status)) {
            wrapper.eq(TagRule::getStatus, status);
        }
        if (StringUtils.hasText(ruleType)) {
            wrapper.eq(TagRule::getRuleType, ruleType);
        }
        wrapper.orderByDesc(TagRule::getCreatedAt);
        return ruleMapper.selectPage(new Page<>(current, size), wrapper);
    }

    @Override
    public TagRule getById(Long id) {
        TagRule rule = ruleMapper.selectById(id);
        if (rule == null) throw new BizException("规则不存在");
        return rule;
    }

    @Override
    public TagRule create(TagRule rule) {
        // 校验规则编码前缀
        String code = rule.getRuleCode().toUpperCase();
        if ("STRUCTURED".equals(rule.getRuleType())) {
            if (!code.startsWith("CR_")) {
                throw new BizException("条件打标规则编码必须以 CR_ 开头");
            }
        } else if ("AI_SEMANTIC".equals(rule.getRuleType())) {
            if (!code.startsWith("AR_")) {
                throw new BizException("智能打标规则编码必须以 AR_ 开头");
            }
        }
        // 唯一性校验
        LambdaQueryWrapper<TagRule> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(TagRule::getRuleCode, code);
        if (ruleMapper.selectCount(wrapper) > 0) {
            throw new BizException("规则编码已存在");
        }
        rule.setRuleCode(code);
        rule.setStatus("UNPUBLISHED");
        rule.setVersionNo(1);
        ruleMapper.insert(rule);
        return rule;
    }

    @Override
    public TagRule update(Long id, TagRule rule) {
        TagRule existing = getById(id);
        if ("PUBLISHED".equals(existing.getStatus())) {
            throw new BizException("已发布的规则不可编辑，请复制后修订");
        }
        existing.setRuleName(rule.getRuleName());
        existing.setRuleType(rule.getRuleType());
        existing.setPriority(rule.getPriority());
        existing.setDslContent(rule.getDslContent());
        existing.setDslExplain(rule.getDslExplain());
        existing.setRemark(rule.getRemark());
        existing.setUpdatedBy(rule.getUpdatedBy());
        ruleMapper.updateById(existing);
        return existing;
    }

    @Override
    public void publish(Long id) {
        TagRule rule = getById(id);
        if ("PUBLISHED".equals(rule.getStatus())) {
            throw new BizException("规则已经是发布状态");
        }
        rule.setStatus("PUBLISHED");
        rule.setPublishedAt(LocalDateTime.now());
        ruleMapper.updateById(rule);
    }

    @Override
    public void stop(Long id) {
        TagRule rule = getById(id);
        if (!"PUBLISHED".equals(rule.getStatus())) {
            throw new BizException("仅已发布的规则可撤销发布");
        }
        rule.setStatus("UNPUBLISHED");
        ruleMapper.updateById(rule);
    }

    @Override
    public TagRule copy(Long id) {
        TagRule source = getById(id);
        TagRule copy = new TagRule();
        copy.setRuleCode(source.getRuleCode() + "_V" + (source.getVersionNo() + 1));
        copy.setRuleName(source.getRuleName() + " (修订)");
        copy.setRuleType(source.getRuleType());
        copy.setPriority(source.getPriority());
        copy.setDslContent(source.getDslContent());
        copy.setDslExplain(source.getDslExplain());
        copy.setRemark(source.getRemark());
        copy.setStatus("UNPUBLISHED");
        copy.setVersionNo(source.getVersionNo() + 1);
        copy.setOriginRuleId(source.getId());
        copy.setCreatedBy(source.getCreatedBy());
        copy.setUpdatedBy(source.getUpdatedBy());
        ruleMapper.insert(copy);
        return copy;
    }

    @Override
    public void delete(Long id) {
        TagRule rule = getById(id);
        if ("PUBLISHED".equals(rule.getStatus())) {
            throw new BizException("已发布的规则不可删除，请先撤销发布");
        }
        ruleMapper.deleteById(id);
    }
}
