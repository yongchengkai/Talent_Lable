package com.talent.label.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.talent.label.common.R;
import com.talent.label.domain.entity.TagDefinition;
import com.talent.label.domain.entity.TagRule;
import com.talent.label.service.TagDefinitionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/tag-definitions")
@RequiredArgsConstructor
public class TagDefinitionController {

    private final TagDefinitionService tagService;

    @GetMapping
    public R<Page<TagDefinition>> page(
            @RequestParam(defaultValue = "1") int current,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long categoryId) {
        return R.ok(tagService.page(current, size, keyword, status, categoryId));
    }

    @GetMapping("/{id}")
    public R<TagDefinition> getById(@PathVariable Long id) {
        return R.ok(tagService.getById(id));
    }

    @PostMapping
    public R<TagDefinition> create(@RequestBody @Valid TagDefinition tag) {
        return R.ok(tagService.create(tag));
    }

    @PutMapping("/{id}")
    public R<TagDefinition> update(@PathVariable Long id, @RequestBody @Valid TagDefinition tag) {
        return R.ok(tagService.update(id, tag));
    }

    @PutMapping("/{id}/status")
    public R<Void> updateStatus(@PathVariable Long id, @RequestParam String status) {
        tagService.updateStatus(id, status);
        return R.ok();
    }

    @DeleteMapping("/{id}")
    public R<Void> delete(@PathVariable Long id) {
        tagService.delete(id);
        return R.ok();
    }

    @PostMapping("/migrate")
    public R<Void> migrate(@RequestBody List<Long> tagIds, @RequestParam Long targetCategoryId) {
        tagService.migrate(tagIds, targetCategoryId);
        return R.ok();
    }

    @GetMapping("/{id}/rules")
    public R<List<Map<String, Object>>> getReferencingRules(@PathVariable Long id) {
        return R.ok(tagService.getReferencingRules(id));
    }
}
