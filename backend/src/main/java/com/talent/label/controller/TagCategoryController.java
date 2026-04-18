package com.talent.label.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.talent.label.common.R;
import com.talent.label.domain.entity.TagCategory;
import com.talent.label.service.TagCategoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/tag-categories")
@RequiredArgsConstructor
public class TagCategoryController {

    private final TagCategoryService categoryService;

    @GetMapping
    public R<Page<TagCategory>> page(
            @RequestParam(defaultValue = "1") int current,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String status) {
        return R.ok(categoryService.page(current, size, keyword, status));
    }

    @GetMapping("/active")
    public R<List<TagCategory>> listActive() {
        return R.ok(categoryService.listActive());
    }

    @GetMapping("/{id}")
    public R<TagCategory> getById(@PathVariable Long id) {
        return R.ok(categoryService.getById(id));
    }

    @PostMapping
    public R<TagCategory> create(@RequestBody @Valid TagCategory category) {
        return R.ok(categoryService.create(category));
    }

    @PutMapping("/{id}")
    public R<TagCategory> update(@PathVariable Long id, @RequestBody @Valid TagCategory category) {
        return R.ok(categoryService.update(id, category));
    }

    @PutMapping("/{id}/status")
    public R<Void> updateStatus(@PathVariable Long id, @RequestParam String status) {
        categoryService.updateStatus(id, status);
        return R.ok();
    }

    @DeleteMapping("/{id}")
    public R<Void> delete(@PathVariable Long id) {
        categoryService.delete(id);
        return R.ok();
    }
}
