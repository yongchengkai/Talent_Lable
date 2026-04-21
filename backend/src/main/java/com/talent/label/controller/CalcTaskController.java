package com.talent.label.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.talent.label.common.R;
import com.talent.label.domain.entity.CalcTask;
import com.talent.label.domain.entity.CalcTaskRule;
import com.talent.label.domain.entity.TagRule;
import com.talent.label.domain.entity.Employee;
import com.talent.label.domain.entity.TagDefinition;
import com.talent.label.domain.entity.EmployeeTagResultDetail;
import com.talent.label.mapper.CalcTaskRuleMapper;
import com.talent.label.mapper.TagRuleMapper;
import com.talent.label.mapper.EmployeeMapper;
import com.talent.label.mapper.TagDefinitionMapper;
import com.talent.label.mapper.EmployeeTagResultDetailMapper;
import com.talent.label.service.CalcTaskService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/calc-tasks")
@RequiredArgsConstructor
public class CalcTaskController {

    private final CalcTaskService taskService;
    private final CalcTaskRuleMapper taskRuleMapper;
    private final TagRuleMapper ruleMapper;
    private final EmployeeMapper employeeMapper;
    private final TagDefinitionMapper tagDefinitionMapper;
    private final EmployeeTagResultDetailMapper detailMapper;

    @GetMapping
    public R<Page<CalcTask>> page(
            @RequestParam(defaultValue = "1") int current,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String taskMode,
            @RequestParam(required = false) String taskStatus,
            @RequestParam(required = false) String submitStatus) {
        return R.ok(taskService.page(current, size, keyword, taskMode, taskStatus, submitStatus));
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
        List<Long> ruleIds = List.of();
        Object ruleIdsObj = body.get("ruleIds");
        if (ruleIdsObj instanceof List<?> list && !list.isEmpty()) {
            ruleIds = list.stream()
                    .map(item -> ((Number) item).longValue())
                    .toList();
        }
        task.setTotalCount(ruleIds.size());
        task.setSuccessCount(0);
        task.setFailCount(0);
        return R.ok(taskService.create(task, ruleIds));
    }

    @PutMapping("/{id}")
    @SuppressWarnings("unchecked")
    public R<CalcTask> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        CalcTask task = new CalcTask();
        task.setTaskName((String) body.get("taskName"));
        task.setTaskType((String) body.get("taskType"));
        task.setTaskScope((String) body.get("taskScope"));
        List<Long> ruleIds = List.of();
        Object ruleIdsObj = body.get("ruleIds");
        if (ruleIdsObj instanceof List<?> list && !list.isEmpty()) {
            ruleIds = list.stream()
                    .map(item -> ((Number) item).longValue())
                    .toList();
        }
        return R.ok(taskService.update(id, task, ruleIds));
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

    @PostMapping("/{id}/revoke")
    public R<Void> revoke(@PathVariable Long id) {
        taskService.revoke(id);
        return R.ok();
    }

    @PostMapping("/{id}/approve")
    public R<Void> approve(@PathVariable Long id) {
        taskService.approve(id);
        return R.ok();
    }

    @PostMapping("/{id}/reject")
    public R<Void> reject(@PathVariable Long id) {
        taskService.reject(id);
        return R.ok();
    }

    @DeleteMapping("/{id}")
    public R<Void> delete(@PathVariable Long id) {
        taskService.delete(id);
        return R.ok();
    }

    @GetMapping("/{id}/rules")
    public R<List<Map<String, Object>>> getRules(@PathVariable Long id) {
        // 获取任务关联的规则
        List<CalcTaskRule> taskRules = taskRuleMapper.selectList(
                new LambdaQueryWrapper<CalcTaskRule>().eq(CalcTaskRule::getTaskId, id));
        if (taskRules.isEmpty()) return R.ok(List.of());

        List<Long> ruleIds = taskRules.stream().map(CalcTaskRule::getRuleId).toList();
        List<TagRule> rules = ruleMapper.selectBatchIds(ruleIds);

        List<Map<String, Object>> result = new ArrayList<>();
        for (TagRule rule : rules) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("ruleId", rule.getId());
            m.put("ruleName", rule.getRuleName());
            m.put("ruleCode", rule.getRuleCode());
            m.put("ruleType", rule.getRuleType());

            // 查询该规则在此任务中的执行情况
            Long hitCount = detailMapper.selectCount(
                    new LambdaQueryWrapper<EmployeeTagResultDetail>()
                            .eq(EmployeeTagResultDetail::getTaskId, id)
                            .eq(EmployeeTagResultDetail::getRuleId, rule.getId())
                            .eq(EmployeeTagResultDetail::getFinalDecision, "HIT"));

            Long totalEvaluated = detailMapper.selectCount(
                    new LambdaQueryWrapper<EmployeeTagResultDetail>()
                            .eq(EmployeeTagResultDetail::getTaskId, id)
                            .eq(EmployeeTagResultDetail::getRuleId, rule.getId()));

            // 判断执行状态：有评估记录则为 SUCCESS，否则看任务状态
            String status;
            if (totalEvaluated > 0) {
                status = "SUCCESS";
            } else {
                CalcTask task = taskService.getById(id);
                status = "INIT".equals(task.getTaskStatus()) ? "PENDING" : "FAILED";
            }

            m.put("status", status);
            m.put("hitCount", hitCount);
            m.put("totalEvaluated", totalEvaluated);
            result.add(m);
        }
        return R.ok(result);
    }

    @GetMapping("/{id}/results")
    public R<List<Map<String, Object>>> getResults(@PathVariable Long id) {
        // 查询该任务的所有证据明细
        List<EmployeeTagResultDetail> details = detailMapper.selectList(
                new LambdaQueryWrapper<EmployeeTagResultDetail>()
                        .eq(EmployeeTagResultDetail::getTaskId, id));

        if (details.isEmpty()) return R.ok(List.of());

        // 获取涉及的员工
        List<Long> empIds = details.stream().map(EmployeeTagResultDetail::getEmployeeId).distinct().toList();
        List<Employee> employees = employeeMapper.selectBatchIds(empIds);
        Map<Long, Employee> empMap = new HashMap<>();
        for (Employee emp : employees) empMap.put(emp.getId(), emp);

        // 获取标签定义
        List<Long> tagIds = details.stream().map(EmployeeTagResultDetail::getTagId).distinct().toList();
        Map<Long, TagDefinition> tagDefMap = new HashMap<>();
        if (!tagIds.isEmpty()) {
            List<TagDefinition> tagDefs = tagDefinitionMapper.selectBatchIds(tagIds);
            for (TagDefinition td : tagDefs) tagDefMap.put(td.getId(), td);
        }

        // 按员工分组
        Map<Long, List<EmployeeTagResultDetail>> grouped = new LinkedHashMap<>();
        for (EmployeeTagResultDetail d : details) {
            grouped.computeIfAbsent(d.getEmployeeId(), k -> new ArrayList<>()).add(d);
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (Map.Entry<Long, List<EmployeeTagResultDetail>> entry : grouped.entrySet()) {
            Employee emp = empMap.get(entry.getKey());
            if (emp == null) continue;

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("employeeId", emp.getId());
            row.put("employeeName", emp.getName());
            row.put("employeeNo", emp.getEmployeeNo());
            row.put("orgName", emp.getOrgName());
            row.put("gradeLevel", emp.getGradeLevel());

            List<String> hitTags = new ArrayList<>();
            List<String> rejectedTags = new ArrayList<>();
            for (EmployeeTagResultDetail d : entry.getValue()) {
                TagDefinition td = tagDefMap.get(d.getTagId());
                if (td == null) continue;
                if ("HIT".equals(d.getFinalDecision())) {
                    hitTags.add(td.getTagName());
                } else {
                    rejectedTags.add(td.getTagName());
                }
            }
            row.put("hitTags", hitTags);
            row.put("rejectedTags", rejectedTags);
            row.put("hitCount", hitTags.size());
            result.add(row);
        }
        return R.ok(result);
    }
}
