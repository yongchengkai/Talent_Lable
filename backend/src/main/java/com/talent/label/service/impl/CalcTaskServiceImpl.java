package com.talent.label.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.talent.label.common.BizException;
import com.talent.label.domain.entity.CalcTask;
import com.talent.label.domain.entity.CalcTaskRule;
import com.talent.label.domain.entity.EmployeeTagResult;
import com.talent.label.domain.entity.EmployeeTagResultDetail;
import com.talent.label.mapper.CalcTaskMapper;
import com.talent.label.mapper.CalcTaskRuleMapper;
import com.talent.label.mapper.EmployeeTagResultMapper;
import com.talent.label.mapper.EmployeeTagResultDetailMapper;
import com.talent.label.service.CalcTaskExecutor;
import com.talent.label.service.CalcTaskService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CalcTaskServiceImpl implements CalcTaskService {

    private final CalcTaskMapper taskMapper;
    private final CalcTaskRuleMapper taskRuleMapper;
    private final CalcTaskExecutor calcTaskExecutor;
    private final EmployeeTagResultMapper resultMapper;
    private final EmployeeTagResultDetailMapper detailMapper;

    @Override
    public Page<CalcTask> page(int current, int size, String keyword, String taskMode, String taskStatus, String submitStatus) {
        LambdaQueryWrapper<CalcTask> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(keyword)) {
            wrapper.and(w -> w.like(CalcTask::getTaskName, keyword)
                    .or().like(CalcTask::getTaskNo, keyword));
        }
        if (StringUtils.hasText(taskMode)) {
            wrapper.eq(CalcTask::getTaskMode, taskMode);
        }
        if (StringUtils.hasText(taskStatus)) {
            wrapper.eq(CalcTask::getTaskStatus, taskStatus);
        }
        if (StringUtils.hasText(submitStatus)) {
            wrapper.eq(CalcTask::getSubmitStatus, submitStatus);
        }
        wrapper.orderByDesc(CalcTask::getCreatedAt);
        return taskMapper.selectPage(new Page<>(current, size), wrapper);
    }

    @Override
    public CalcTask getById(Long id) {
        CalcTask task = taskMapper.selectById(id);
        if (task == null) throw new BizException("任务不存在");
        return task;
    }

    @Override
    @Transactional
    public CalcTask create(CalcTask task, List<Long> ruleIds) {
        task.setTaskNo("TASK_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        task.setTaskStatus("INIT");
        task.setSubmitStatus("PENDING");
        taskMapper.insert(task);
        for (Long ruleId : ruleIds) {
            CalcTaskRule tr = new CalcTaskRule();
            tr.setTaskId(task.getId());
            tr.setRuleId(ruleId);
            taskRuleMapper.insert(tr);
        }
        return task;
    }

    @Override
    @Transactional
    public CalcTask update(Long id, CalcTask task, List<Long> ruleIds) {
        CalcTask existing = getById(id);
        if ("RUNNING".equals(existing.getTaskStatus())) {
            throw new BizException("运行中的任务不可编辑");
        }
        if ("SUCCESS".equals(existing.getTaskStatus())) {
            throw new BizException("运行成功的任务需先撤销后才能编辑");
        }
        if ("SUBMITTED".equals(existing.getSubmitStatus()) || "APPROVED".equals(existing.getSubmitStatus())) {
            throw new BizException("已提交或已审批的任务不可编辑");
        }
        existing.setTaskName(task.getTaskName());
        existing.setTaskType(task.getTaskType());
        existing.setTaskScope(task.getTaskScope());
        existing.setTotalCount(ruleIds.size());
        existing.setSuccessCount(0);
        existing.setFailCount(0);
        // 编辑后重置为 INIT
        if (!"INIT".equals(existing.getTaskStatus())) {
            existing.setTaskStatus("INIT");
            existing.setErrorMessage(null);
            existing.setStartTime(null);
            existing.setEndTime(null);
        }
        taskMapper.updateById(existing);
        // 删除旧的规则关联，重新插入
        taskRuleMapper.delete(new LambdaQueryWrapper<CalcTaskRule>().eq(CalcTaskRule::getTaskId, id));
        for (Long ruleId : ruleIds) {
            CalcTaskRule tr = new CalcTaskRule();
            tr.setTaskId(id);
            tr.setRuleId(ruleId);
            taskRuleMapper.insert(tr);
        }
        return existing;
    }

    @Override
    public void run(Long id) {
        CalcTask task = getById(id);
        if ("RUNNING".equals(task.getTaskStatus())) {
            throw new BizException("任务正在运行中");
        }
        // 已提交的任务不允许重新运行
        if ("SUBMITTED".equals(task.getSubmitStatus())) {
            throw new BizException("任务已提交，不可重新运行");
        }
        task.setTaskStatus("RUNNING");
        task.setStartTime(LocalDateTime.now());
        task.setEndTime(null);
        task.setErrorMessage(null);
        task.setSuccessCount(0);
        task.setFailCount(0);
        task.setSubmitStatus("PENDING");
        taskMapper.updateById(task);
        // 异步执行打标逻辑
        calcTaskExecutor.execute(id);
    }

    @Override
    public void submit(Long id) {
        CalcTask task = getById(id);
        if (!"SUCCESS".equals(task.getTaskStatus())) {
            throw new BizException("仅运行成功的任务可提交");
        }
        if (!"FORMAL".equals(task.getTaskMode())) {
            throw new BizException("仅正式打标任务可提交");
        }
        task.setSubmitStatus("SUBMITTED");
        taskMapper.updateById(task);
    }

    @Override
    public void approve(Long id) {
        CalcTask task = getById(id);
        if (!"SUBMITTED".equals(task.getSubmitStatus())) {
            throw new BizException("仅已提交的任务可审批通过");
        }
        task.setSubmitStatus("APPROVED");
        taskMapper.updateById(task);

        // 审批通过：将该任务产出的标签结果 validFlag 置为 true（正式生效）
        // 先失效旧的同员工同标签结果，再激活本次结果
        List<EmployeeTagResult> results = resultMapper.selectList(
                new LambdaQueryWrapper<EmployeeTagResult>().eq(EmployeeTagResult::getTaskId, id));
        for (EmployeeTagResult r : results) {
            // 失效旧的同标签结果（其他任务产出的）
            resultMapper.update(null, new com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper<EmployeeTagResult>()
                    .eq(EmployeeTagResult::getEmployeeId, r.getEmployeeId())
                    .eq(EmployeeTagResult::getTagId, r.getTagId())
                    .eq(EmployeeTagResult::getValidFlag, true)
                    .ne(EmployeeTagResult::getTaskId, id)
                    .set(EmployeeTagResult::getValidFlag, false));
        }
        // 激活本次任务的结果
        resultMapper.update(null, new com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper<EmployeeTagResult>()
                .eq(EmployeeTagResult::getTaskId, id)
                .set(EmployeeTagResult::getValidFlag, true));
    }

    @Override
    public void reject(Long id) {
        CalcTask task = getById(id);
        if (!"SUBMITTED".equals(task.getSubmitStatus())) {
            throw new BizException("仅已提交的任务可驳回");
        }
        task.setSubmitStatus("REJECTED");
        taskMapper.updateById(task);
    }

    @Override
    @Transactional
    public void revoke(Long id) {
        CalcTask task = getById(id);
        if (!"SUCCESS".equals(task.getTaskStatus())) {
            throw new BizException("仅运行成功的任务可撤销");
        }
        if ("SUBMITTED".equals(task.getSubmitStatus())) {
            throw new BizException("已提交审批的任务不可撤销");
        }
        // 删除该任务产出的标签结果和证据
        detailMapper.delete(new LambdaQueryWrapper<EmployeeTagResultDetail>()
                .eq(EmployeeTagResultDetail::getTaskId, id));
        resultMapper.delete(new LambdaQueryWrapper<EmployeeTagResult>()
                .eq(EmployeeTagResult::getTaskId, id));
        // 重置任务状态
        task.setTaskStatus("INIT");
        task.setStartTime(null);
        task.setEndTime(null);
        task.setErrorMessage(null);
        task.setSuccessCount(0);
        task.setFailCount(0);
        taskMapper.updateById(task);
    }

    @Override
    public void delete(Long id) {
        CalcTask task = getById(id);
        if ("RUNNING".equals(task.getTaskStatus())) {
            throw new BizException("运行中的任务不可删除");
        }
        if ("SUCCESS".equals(task.getTaskStatus())) {
            throw new BizException("运行成功的任务需先撤销后才能删除");
        }
        if ("SUBMITTED".equals(task.getSubmitStatus()) || "APPROVED".equals(task.getSubmitStatus())) {
            throw new BizException("已提交或已审批的任务不可删除");
        }
        // 删除关联的规则、结果和证据
        taskRuleMapper.delete(new LambdaQueryWrapper<CalcTaskRule>().eq(CalcTaskRule::getTaskId, id));
        detailMapper.delete(new LambdaQueryWrapper<EmployeeTagResultDetail>().eq(EmployeeTagResultDetail::getTaskId, id));
        resultMapper.delete(new LambdaQueryWrapper<EmployeeTagResult>().eq(EmployeeTagResult::getTaskId, id));
        taskMapper.deleteById(id);
    }
}
