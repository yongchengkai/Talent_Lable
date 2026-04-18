package com.talent.label.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.talent.label.common.BizException;
import com.talent.label.domain.entity.AiSkill;
import com.talent.label.mapper.AiSkillMapper;
import com.talent.label.service.SkillService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SkillServiceImpl implements SkillService {

    private final AiSkillMapper skillMapper;

    @Override
    public Page<AiSkill> page(int current, int size, String keyword, String category) {
        LambdaQueryWrapper<AiSkill> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(keyword)) {
            wrapper.and(w -> w.like(AiSkill::getSkillName, keyword)
                    .or().like(AiSkill::getSkillCode, keyword));
        }
        if (StringUtils.hasText(category)) {
            wrapper.eq(AiSkill::getCategory, category);
        }
        wrapper.orderByAsc(AiSkill::getSortOrder).orderByDesc(AiSkill::getCreatedAt);
        return skillMapper.selectPage(new Page<>(current, size), wrapper);
    }

    @Override
    public AiSkill getById(Long id) {
        AiSkill skill = skillMapper.selectById(id);
        if (skill == null) throw new BizException("技能不存在");
        return skill;
    }

    @Override
    public AiSkill create(AiSkill skill) {
        Long count = skillMapper.selectCount(
                new LambdaQueryWrapper<AiSkill>().eq(AiSkill::getSkillCode, skill.getSkillCode()));
        if (count > 0) throw new BizException("技能编码已存在");
        skill.setCreatedBy("admin");
        skill.setUpdatedBy("admin");
        skillMapper.insert(skill);
        return skill;
    }

    @Override
    public AiSkill update(Long id, AiSkill skill) {
        AiSkill existing = getById(id);
        skill.setId(id);
        skill.setSkillCode(existing.getSkillCode());
        skill.setUpdatedBy("admin");
        skillMapper.updateById(skill);
        return skillMapper.selectById(id);
    }

    @Override
    public void delete(Long id) {
        getById(id);
        skillMapper.deleteById(id);
    }

    @Override
    public void toggleEnabled(Long id) {
        AiSkill skill = getById(id);
        skill.setEnabled(!Boolean.TRUE.equals(skill.getEnabled()));
        skill.setUpdatedBy("admin");
        skillMapper.updateById(skill);
    }

    @Override
    public List<AiSkill> listActive() {
        return skillMapper.selectList(
                new LambdaQueryWrapper<AiSkill>()
                        .eq(AiSkill::getEnabled, true)
                        .orderByAsc(AiSkill::getSortOrder));
    }
}
