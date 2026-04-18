package com.talent.label.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.talent.label.common.R;
import com.talent.label.domain.entity.AiModelConfig;
import com.talent.label.service.ModelConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/model-configs")
@RequiredArgsConstructor
public class ModelConfigController {

    private final ModelConfigService modelConfigService;

    @GetMapping
    public R<Page<AiModelConfig>> page(@RequestParam(defaultValue = "1") int current,
                                        @RequestParam(defaultValue = "20") int size,
                                        @RequestParam(required = false) String keyword,
                                        @RequestParam(required = false) String provider,
                                        @RequestParam(required = false) String status) {
        return R.ok(modelConfigService.page(current, size, keyword, provider, status));
    }

    @GetMapping("/{id}")
    public R<AiModelConfig> getById(@PathVariable Long id) {
        return R.ok(modelConfigService.getById(id));
    }

    @GetMapping("/active")
    public R<List<AiModelConfig>> listActive() {
        return R.ok(modelConfigService.listActive());
    }

    @PostMapping
    public R<AiModelConfig> create(@RequestBody AiModelConfig config) {
        return R.ok(modelConfigService.create(config));
    }

    @PutMapping("/{id}")
    public R<AiModelConfig> update(@PathVariable Long id, @RequestBody AiModelConfig config) {
        return R.ok(modelConfigService.update(id, config));
    }

    @DeleteMapping("/{id}")
    public R<Void> delete(@PathVariable Long id) {
        modelConfigService.delete(id);
        return R.ok(null);
    }

    @PutMapping("/{id}/default")
    public R<Void> setDefault(@PathVariable Long id) {
        modelConfigService.setDefault(id);
        return R.ok(null);
    }

    @PostMapping("/{id}/test")
    public R<Map<String, Object>> testConnection(@PathVariable Long id) {
        return R.ok(modelConfigService.testConnection(id));
    }
}
