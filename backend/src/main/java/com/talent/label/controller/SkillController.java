package com.talent.label.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.talent.label.common.R;
import com.talent.label.domain.entity.AiSkill;
import com.talent.label.service.SkillService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/skills")
@RequiredArgsConstructor
public class SkillController {

    private final SkillService skillService;

    @GetMapping
    public R<Page<AiSkill>> page(@RequestParam(defaultValue = "1") int current,
                                  @RequestParam(defaultValue = "20") int size,
                                  @RequestParam(required = false) String keyword,
                                  @RequestParam(required = false) String category) {
        return R.ok(skillService.page(current, size, keyword, category));
    }

    @GetMapping("/{id}")
    public R<AiSkill> getById(@PathVariable Long id) {
        return R.ok(skillService.getById(id));
    }

    @PostMapping
    public R<AiSkill> create(@RequestBody AiSkill skill) {
        return R.ok(skillService.create(skill));
    }

    @PutMapping("/{id}")
    public R<AiSkill> update(@PathVariable Long id, @RequestBody AiSkill skill) {
        return R.ok(skillService.update(id, skill));
    }

    @DeleteMapping("/{id}")
    public R<Void> delete(@PathVariable Long id) {
        skillService.delete(id);
        return R.ok(null);
    }

    @PutMapping("/{id}/toggle")
    public R<Void> toggleEnabled(@PathVariable Long id) {
        skillService.toggleEnabled(id);
        return R.ok(null);
    }
}
