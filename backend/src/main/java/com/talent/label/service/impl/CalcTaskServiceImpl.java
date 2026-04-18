package com.talent.label.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.talent.label.common.BizException;
import com.talent.label.domain.entity.CalcTask;
import com.talent.label.domain.entity.CalcTaskRule;
import com.talent.label.mapper.CalcTaskMapper;
import com.talent.label.mapper.CalcTaskRuleMapper;
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

    @Override
    public Page<CalcTask> page(int current, int size, String keyword, String taskMode, String taskStatus) {
        LambdaQueryWrapper<CalcTask> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(keyword)) {
            wrapper.like(CalcTask::getTaskName, keyword);
        }
        if (StringUtils.hasText(taskMode)) {
            wrapper.eq(CalcTask::getTaskMode, taskMode);
        }
        if (StringUtils.hasText(taskStatus)) {
            wrapper.eq(CalcTask::getTaskStatus, taskStatus);
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
    public void run(Long id) {
        CalcTask task = getById(id);
        if (!"INIT".equals(task.getTaskStatus()) && !"FAILED".equals(task.getTaskStatus())) {
            throw new BizException("当前状态不允许运行");
        }
        task.setTaskStatus("RUNNING");
        task.setStartTime(LocalDateTime.now());
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
    public void delete(Long id) {
        CalcTask task = getById(id);
        if ("RUNNING".equals(task.getTaskStatus())) {
            throw new BizException("运行中的任务不可删除");
        }
        taskMapper.deleteById(id);
    }
}
