package com.talent.label.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.talent.label.common.R;
import com.talent.label.domain.entity.TagRule;
import com.talent.label.service.TagRuleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/tag-rules")
@RequiredArgsConstructor
public class TagRuleController {

    private final TagRuleService ruleService;

    @GetMapping
    public R<Page<TagRule>> page(
            @RequestParam(defaultValue = "1") int current,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String ruleType) {
        return R.ok(ruleService.page(current, size, keyword, status, ruleType));
    }

    @GetMapping("/{id}")
    public R<TagRule> getById(@PathVariable Long id) {
        return R.ok(ruleService.getById(id));
    }

    @PostMapping
    public R<TagRule> create(@RequestBody @Valid TagRule rule) {
        return R.ok(ruleService.create(rule));
    }

    @PutMapping("/{id}")
    public R<TagRule> update(@PathVariable Long id, @RequestBody @Valid TagRule rule) {
        return R.ok(ruleService.update(id, rule));
    }

    @PostMapping("/{id}/publish")
    public R<Void> publish(@PathVariable Long id) {
        ruleService.publish(id);
        return R.ok();
    }

    @PostMapping("/{id}/stop")
    public R<Void> stop(@PathVariable Long id) {
        ruleService.stop(id);
        return R.ok();
    }

    @PostMapping("/{id}/copy")
    public R<TagRule> copy(@PathVariable Long id) {
        return R.ok(ruleService.copy(id));
    }

    @DeleteMapping("/{id}")
    public R<Void> delete(@PathVariable Long id) {
        ruleService.delete(id);
        return R.ok();
    }
}
