package com.talent.label.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.talent.label.domain.entity.*;
import com.talent.label.mapper.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.*;

@Slf4j
@Component
@RequiredArgsConstructor
public class CalcTaskExecutor {

    private final CalcTaskMapper taskMapper;
    private final CalcTaskRuleMapper taskRuleMapper;
    private final TagRuleMapper ruleMapper;
    private final EmployeeMapper employeeMapper;
    private final TagDefinitionMapper tagDefinitionMapper;
    private final EmployeeTagResultMapper resultMapper;
    private final EmployeeTagResultDetailMapper detailMapper;
    private final DslParser dslParser;
    private final ObjectMapper objectMapper;

    @Async
    public void execute(Long taskId) {
        CalcTask task = taskMapper.selectById(taskId);
        if (task == null) return;

        int totalCount = 0;
        int successCount = 0;
        int failCount = 0;

        try {
            // 1. 获取任务关联的规则
            List<CalcTaskRule> taskRules = taskRuleMapper.selectList(
                    new LambdaQueryWrapper<CalcTaskRule>().eq(CalcTaskRule::getTaskId, taskId));
            List<Long> ruleIds = taskRules.stream().map(CalcTaskRule::getRuleId).toList();

            if (ruleIds.isEmpty()) {
                finishTask(task, 0, 0, 0, "没有关联规则");
                return;
            }

            // 2. 获取目标员工
            List<Employee> employees = getTargetEmployees(task);
            if (employees.isEmpty()) {
                finishTask(task, 0, 0, 0, "没有匹配的员工");
                return;
            }

            // 3. 获取规则列表
            List<TagRule> rules = ruleMapper.selectBatchIds(ruleIds);

            // 4. 预加载标签编码 → ID 映射
            List<TagDefinition> allTags = tagDefinitionMapper.selectList(
                    new LambdaQueryWrapper<TagDefinition>());
            Map<String, Long> tagCodeToId = new HashMap<>();
            for (TagDefinition t : allTags) {
                tagCodeToId.put(t.getTagCode(), t.getId());
            }

            // 5. 逐规则逐员工执行
            for (TagRule rule : rules) {
                if (!"STRUCTURED".equals(rule.getRuleType())) {
                    log.info("跳过非结构化规则: {} ({})", rule.getRuleName(), rule.getRuleType());
                    continue;
                }

                DslParser.DslData dsl;
                try {
                    dsl = dslParser.parse(rule.getDslContent());
                } catch (Exception e) {
                    log.error("规则 {} DSL 解析失败: {}", rule.getRuleCode(), e.getMessage());
                    failCount++;
                    continue;
                }

                // 提取输出标签 ID
                List<String> tagCodes = dslParser.extractTagCodes(dsl);
                List<Long> outputTagIds = new ArrayList<>();
                for (String code : tagCodes) {
                    Long tagId = tagCodeToId.get(code);
                    if (tagId != null) outputTagIds.add(tagId);
                    else log.warn("规则 {} 引用的标签编码 {} 不存在", rule.getRuleCode(), code);
                }

                if (outputTagIds.isEmpty()) {
                    log.warn("规则 {} 没有有效的输出标签", rule.getRuleCode());
                    continue;
                }

                for (Employee emp : employees) {
                    totalCount++;
                    try {
                        boolean hit = dslParser.evaluate(dsl, emp);

                        // 写入证据明细
                        for (Long tagId : outputTagIds) {
                            EmployeeTagResultDetail detail = new EmployeeTagResultDetail();
                            detail.setTaskId(taskId);
                            detail.setEmployeeId(emp.getId());
                            detail.setRuleId(rule.getId());
                            detail.setTagId(tagId);
                            detail.setEvidenceType("STRUCTURED");
                            detail.setScopeMatched(true);
                            detail.setConditionMatched(hit);
                            detail.setConditionSnapshot(rule.getDslContent());
                            detail.setFinalDecision(hit ? "HIT" : "REJECTED");
                            detailMapper.insert(detail);

                            // 命中则写入标签结果
                            if (hit) {
                                writeTagResult(emp.getId(), tagId, rule.getId(), taskId, task.getTaskMode());
                            }
                        }
                        successCount++;
                    } catch (Exception e) {
                        log.error("规则 {} 对员工 {} 执行失败", rule.getRuleCode(), emp.getEmployeeNo(), e);
                        failCount++;
                    }
                }
            }

            finishTask(task, totalCount, successCount, failCount, null);

        } catch (Exception e) {
            log.error("任务 {} 执行异常", taskId, e);
            task.setTaskStatus("FAILED");
            task.setEndTime(LocalDateTime.now());
            task.setErrorMessage(e.getMessage());
            taskMapper.updateById(task);
        }
    }

    /** 写入标签结果（正式模式写入有效结果，模拟模式也写入但标记为模拟） */
    private void writeTagResult(Long employeeId, Long tagId, Long ruleId, Long taskId, String taskMode) {
        if ("FORMAL".equals(taskMode)) {
            // 正式模式：先失效旧的同标签结果，再写入新的
            resultMapper.update(null, new com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper<EmployeeTagResult>()
                    .eq(EmployeeTagResult::getEmployeeId, employeeId)
                    .eq(EmployeeTagResult::getTagId, tagId)
                    .eq(EmployeeTagResult::getValidFlag, true)
                    .set(EmployeeTagResult::getValidFlag, false));
        }

        EmployeeTagResult result = new EmployeeTagResult();
        result.setEmployeeId(employeeId);
        result.setTagId(tagId);
        result.setSourceRuleId(ruleId);
        result.setTaskId(taskId);
        result.setHitTime(LocalDateTime.now());
        result.setValidFlag("FORMAL".equals(taskMode)); // 模拟模式 validFlag=false
        resultMapper.insert(result);
    }

    /** 获取目标员工（根据 taskScope） */
    private List<Employee> getTargetEmployees(CalcTask task) {
        LambdaQueryWrapper<Employee> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Employee::getEmployeeStatus, "ACTIVE");

        String scope = task.getTaskScope();
        if (scope != null && !scope.isEmpty() && !"null".equals(scope)) {
            try {
                Map<String, Object> scopeMap = objectMapper.readValue(scope, new TypeReference<>() {});
                List<Number> orgIds = (List<Number>) scopeMap.get("orgIds");
                List<Number> employeeIds = (List<Number>) scopeMap.get("employeeIds");

                boolean hasOrgs = orgIds != null && !orgIds.isEmpty();
                boolean hasEmployees = employeeIds != null && !employeeIds.isEmpty();

                if (hasOrgs || hasEmployees) {
                    wrapper.and(w -> {
                        if (hasOrgs) {
                            List<Long> oids = orgIds.stream().map(Number::longValue).toList();
                            w.in(Employee::getOrgId, oids);
                        }
                        if (hasOrgs && hasEmployees) w.or();
                        if (hasEmployees) {
                            List<Long> eids = employeeIds.stream().map(Number::longValue).toList();
                            w.in(Employee::getId, eids);
                        }
                    });
                }
            } catch (Exception e) {
                log.warn("解析 taskScope 失败，使用全员: {}", e.getMessage());
            }
        }

        return employeeMapper.selectList(wrapper);
    }

    private void finishTask(CalcTask task, int total, int success, int fail, String errorMsg) {
        task.setTaskStatus(fail > 0 && success == 0 ? "FAILED" : "SUCCESS");
        task.setTotalCount(total);
        task.setSuccessCount(success);
        task.setFailCount(fail);
        task.setEndTime(LocalDateTime.now());
        task.setErrorMessage(errorMsg);
        taskMapper.updateById(task);
        log.info("任务 {} 执行完成: total={}, success={}, fail={}", task.getTaskNo(), total, success, fail);
    }
}
