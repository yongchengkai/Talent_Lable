package com.talent.label.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.talent.label.common.BizException;
import com.talent.label.domain.entity.CalcTaskRule;
import com.talent.label.domain.entity.CalcTask;
import com.talent.label.domain.entity.EmployeeTagResult;
import com.talent.label.domain.entity.TagRule;
import com.talent.label.mapper.CalcTaskMapper;
import com.talent.label.mapper.CalcTaskRuleMapper;
import com.talent.label.mapper.EmployeeTagResultMapper;
import com.talent.label.mapper.TagRuleMapper;
import com.talent.label.service.TagRuleService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class TagRuleServiceImpl implements TagRuleService {

    private final TagRuleMapper ruleMapper;
    private final EmployeeTagResultMapper tagResultMapper;
    private final CalcTaskRuleMapper taskRuleMapper;
    private final CalcTaskMapper taskMapper;

    @Override
    public Page<TagRule> page(int current, int size, String keyword, String status, String ruleType) {
        LambdaQueryWrapper<TagRule> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(keyword)) {
            wrapper.and(w -> w.like(TagRule::getRuleName, keyword)
                    .or().like(TagRule::getRuleCode, keyword));
        }
        if (StringUtils.hasText(status)) {
            wrapper.eq(TagRule::getStatus, status);
        }
        if (StringUtils.hasText(ruleType)) {
            wrapper.eq(TagRule::getRuleType, ruleType);
        }
        wrapper.orderByDesc(TagRule::getCreatedAt);
        Page<TagRule> page = ruleMapper.selectPage(new Page<>(current, size), wrapper);
        // 填充每条规则的正式任务引用数
        for (TagRule rule : page.getRecords()) {
            rule.setFormalTaskCount(countFormalTaskReferences(rule.getId()));
        }
        return page;
    }

    @Override
    public TagRule getById(Long id) {
        TagRule rule = ruleMapper.selectById(id);
        if (rule == null) throw new BizException("规则不存在");
        return rule;
    }

    @Override
    public TagRule create(TagRule rule) {
        // 校验规则编码前缀
        String code = rule.getRuleCode().toUpperCase();
        if ("STRUCTURED".equals(rule.getRuleType())) {
            if (!code.startsWith("CR_")) {
                throw new BizException("条件打标规则编码必须以 CR_ 开头");
            }
        } else if ("AI_SEMANTIC".equals(rule.getRuleType())) {
            if (!code.startsWith("AR_")) {
                throw new BizException("智能打标规则编码必须以 AR_ 开头");
            }
        }
        // 唯一性校验
        LambdaQueryWrapper<TagRule> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(TagRule::getRuleCode, code);
        if (ruleMapper.selectCount(wrapper) > 0) {
            throw new BizException("规则编码已存在");
        }
        rule.setRuleCode(code);
        rule.setStatus("UNPUBLISHED");
        rule.setVersionNo(1);
        ruleMapper.insert(rule);
        return rule;
    }

    @Override
    public TagRule update(Long id, TagRule rule) {
        TagRule existing = getById(id);
        // 检查是否被正式任务运行成功或运行中，如果是则不可编辑
        List<CalcTaskRule> taskRules = taskRuleMapper.selectList(
                new LambdaQueryWrapper<CalcTaskRule>().eq(CalcTaskRule::getRuleId, id));
        if (!taskRules.isEmpty()) {
            List<Long> taskIds = taskRules.stream().map(CalcTaskRule::getTaskId).toList();
            Long blockedCount = taskMapper.selectCount(
                    new LambdaQueryWrapper<CalcTask>()
                            .in(CalcTask::getId, taskIds)
                            .eq(CalcTask::getTaskMode, "FORMAL")
                            .in(CalcTask::getTaskStatus, List.of("RUNNING", "SUCCESS")));
            if (blockedCount > 0) {
                throw new BizException("该规则已被正式打标任务使用（运行中或已成功），不可编辑。请先撤销相关任务后再编辑。");
            }
        }
        existing.setRuleName(rule.getRuleName());
        existing.setRuleType(rule.getRuleType());
        existing.setPriority(rule.getPriority());
        existing.setDslContent(rule.getDslContent());
        existing.setDslExplain(rule.getDslExplain());
        existing.setRemark(rule.getRemark());
        existing.setUpdatedBy(rule.getUpdatedBy());
        ruleMapper.updateById(existing);
        return existing;
    }

    @Override
    public void publish(Long id) {
        TagRule rule = getById(id);
        if ("PUBLISHED".equals(rule.getStatus())) {
            throw new BizException("规则已经是发布状态");
        }
        rule.setStatus("PUBLISHED");
        rule.setPublishedAt(LocalDateTime.now());
        ruleMapper.updateById(rule);
    }

    @Override
    public void stop(Long id) {
        TagRule rule = getById(id);
        if (!"PUBLISHED".equals(rule.getStatus())) {
            throw new BizException("仅已发布的规则可撤销");
        }

        // 检查是否被正式打标任务引用
        List<CalcTaskRule> taskRules = taskRuleMapper.selectList(
                new LambdaQueryWrapper<CalcTaskRule>().eq(CalcTaskRule::getRuleId, id));
        if (!taskRules.isEmpty()) {
            List<Long> taskIds = taskRules.stream().map(CalcTaskRule::getTaskId).toList();
            Long formalCount = taskMapper.selectCount(
                    new LambdaQueryWrapper<CalcTask>()
                            .in(CalcTask::getId, taskIds)
                            .eq(CalcTask::getTaskMode, "FORMAL"));
            if (formalCount > 0) {
                throw new BizException("该规则已被正式打标任务引用，不可撤销");
            }
        }

        rule.setStatus("UNPUBLISHED");
        ruleMapper.updateById(rule);

        // 撤销时，该规则产出的当前有效标签结果一并失效
        tagResultMapper.update(null, new LambdaUpdateWrapper<EmployeeTagResult>()
                .eq(EmployeeTagResult::getSourceRuleId, id)
                .eq(EmployeeTagResult::getValidFlag, true)
                .set(EmployeeTagResult::getValidFlag, false));
    }

    @Override
    public void rollback(Long id) {
        TagRule rule = getById(id);
        List<CalcTaskRule> taskRules = taskRuleMapper.selectList(
                new LambdaQueryWrapper<CalcTaskRule>().eq(CalcTaskRule::getRuleId, id));
        if (!taskRules.isEmpty()) {
            List<Long> taskIds = taskRules.stream().map(CalcTaskRule::getTaskId).toList();
            Long runningCount = taskMapper.selectCount(
                    new LambdaQueryWrapper<CalcTask>()
                            .in(CalcTask::getId, taskIds)
                            .eq(CalcTask::getTaskStatus, "RUNNING"));
            if (runningCount != null && runningCount > 0) {
                throw new BizException("该规则关联的任务正在运行中，请先等待任务结束后再回退规则");
            }

            // 检查是否有已提交审批的任务关联了这条规则
            Long submittedCount = taskMapper.selectCount(
                    new LambdaQueryWrapper<CalcTask>()
                            .in(CalcTask::getId, taskIds)
                            .eq(CalcTask::getSubmitStatus, "SUBMITTED"));
            if (submittedCount > 0) {
                throw new BizException("该规则关联的任务已提交审批，请先回退任务后再回退规则");
            }
        }

        // 回退：状态改为未发布，清空发布时间
        rule.setStatus("UNPUBLISHED");
        rule.setPublishedAt(null);
        ruleMapper.updateById(rule);

        // 该规则产出的所有有效标签结果失效
        tagResultMapper.update(null, new LambdaUpdateWrapper<EmployeeTagResult>()
                .eq(EmployeeTagResult::getSourceRuleId, id)
                .eq(EmployeeTagResult::getValidFlag, true)
                .set(EmployeeTagResult::getValidFlag, false));
    }

    @Override
    public List<Map<String, Object>> getFormalTasks(Long id) {
        List<CalcTaskRule> taskRules = taskRuleMapper.selectList(
                new LambdaQueryWrapper<CalcTaskRule>().eq(CalcTaskRule::getRuleId, id));
        if (taskRules.isEmpty()) return List.of();

        List<Long> taskIds = taskRules.stream().map(CalcTaskRule::getTaskId).toList();
        List<CalcTask> tasks = taskMapper.selectList(
                new LambdaQueryWrapper<CalcTask>()
                        .in(CalcTask::getId, taskIds)
                        .eq(CalcTask::getTaskMode, "FORMAL"));
        if (tasks.isEmpty()) return List.of();

        List<Map<String, Object>> result = new ArrayList<>();
        for (CalcTask task : tasks) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("taskId", task.getId());
            m.put("taskNo", task.getTaskNo());
            m.put("taskName", task.getTaskName());
            m.put("taskStatus", task.getTaskStatus());
            m.put("submitStatus", task.getSubmitStatus());
            result.add(m);
        }
        return result;
    }

    @Override
    public TagRule copy(Long id) {
        TagRule source = getById(id);
        TagRule copy = new TagRule();
        copy.setRuleCode(source.getRuleCode() + "_V" + (source.getVersionNo() + 1));
        copy.setRuleName(source.getRuleName() + " (修订)");
        copy.setRuleType(source.getRuleType());
        copy.setPriority(source.getPriority());
        copy.setDslContent(source.getDslContent());
        copy.setDslExplain(source.getDslExplain());
        copy.setRemark(source.getRemark());
        copy.setStatus("UNPUBLISHED");
        copy.setVersionNo(source.getVersionNo() + 1);
        copy.setOriginRuleId(source.getId());
        copy.setCreatedBy(source.getCreatedBy());
        copy.setUpdatedBy(source.getUpdatedBy());
        ruleMapper.insert(copy);
        return copy;
    }

    @Override
    public void delete(Long id) {
        TagRule rule = getById(id);
        // 检查是否被任何任务（模拟+正式）引用
        List<CalcTaskRule> taskRules = taskRuleMapper.selectList(
                new LambdaQueryWrapper<CalcTaskRule>().eq(CalcTaskRule::getRuleId, id));
        if (!taskRules.isEmpty()) {
            throw new BizException("该规则已被打标任务引用，不可删除。请先删除引用该规则的任务后再操作。");
        }
        ruleMapper.deleteById(id);
    }

    /** 检查规则是否被正式打标任务引用 */
    private boolean hasFormalTaskReference(Long ruleId) {
        return countFormalTaskReferences(ruleId) > 0;
    }

    /** 统计规则被正式打标任务引用的数量 */
    private long countFormalTaskReferences(Long ruleId) {
        List<CalcTaskRule> taskRules = taskRuleMapper.selectList(
                new LambdaQueryWrapper<CalcTaskRule>().eq(CalcTaskRule::getRuleId, ruleId));
        if (taskRules.isEmpty()) return 0;
        List<Long> taskIds = taskRules.stream().map(CalcTaskRule::getTaskId).toList();
        Long formalCount = taskMapper.selectCount(
                new LambdaQueryWrapper<CalcTask>()
                        .in(CalcTask::getId, taskIds)
                        .eq(CalcTask::getTaskMode, "FORMAL"));
        return formalCount != null ? formalCount : 0;
    }
}
