package com.talent.label.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.talent.label.common.R;
import com.talent.label.domain.entity.CalcTask;
import com.talent.label.service.CalcTaskService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/calc-tasks")
@RequiredArgsConstructor
public class CalcTaskController {

    private final CalcTaskService taskService;

    @GetMapping
    public R<Page<CalcTask>> page(
            @RequestParam(defaultValue = "1") int current,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String taskMode,
            @RequestParam(required = false) String taskStatus) {
        return R.ok(taskService.page(current, size, keyword, taskMode, taskStatus));
    }

    @GetMapping("/{id}")
    public R<CalcTask> getById(@PathVariable Long id) {
        return R.ok(taskService.getById(id));
    }

    @PostMapping
    @SuppressWarnings("unchecked")
    public R<CalcTask> create(@RequestBody Map<String, Object> body) {
        CalcTask task = new CalcTask();
        task.setTaskName((String) body.get("taskName"));
        task.setTaskType((String) body.get("taskType"));
        task.setTaskMode((String) body.get("taskMode"));
        task.setTaskScope((String) body.get("taskScope"));
        task.setTriggeredBy((String) body.get("triggeredBy"));
        task.setTotalCount(0);
        task.setSuccessCount(0);
        task.setFailCount(0);
        List<Long> ruleIds = List.of();
        Object ruleIdsObj = body.get("ruleIds");
        if (ruleIdsObj instanceof List<?> list && !list.isEmpty()) {
            ruleIds = list.stream()
                    .map(item -> ((Number) item).longValue())
                    .toList();
        }
        return R.ok(taskService.create(task, ruleIds));
    }

    @PostMapping("/{id}/run")
    public R<Void> run(@PathVariable Long id) {
        taskService.run(id);
        return R.ok();
    }

    @PostMapping("/{id}/submit")
    public R<Void> submit(@PathVariable Long id) {
        taskService.submit(id);
        return R.ok();
    }

    @DeleteMapping("/{id}")
    public R<Void> delete(@PathVariable Long id) {
        taskService.delete(id);
        return R.ok();
    }
}
