package com.talent.label.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.talent.label.domain.entity.AiSkill;
import java.util.List;

public interface SkillService {
    Page<AiSkill> page(int current, int size, String keyword, String category);
    AiSkill getById(Long id);
    AiSkill create(AiSkill skill);
    AiSkill update(Long id, AiSkill skill);
    void delete(Long id);
    void toggleEnabled(Long id);
    List<AiSkill> listActive();
}
