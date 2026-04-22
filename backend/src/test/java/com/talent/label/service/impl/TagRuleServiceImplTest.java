package com.talent.label.service.impl;

import com.talent.label.common.BizException;
import com.talent.label.domain.entity.CalcTaskRule;
import com.talent.label.domain.entity.TagRule;
import com.talent.label.mapper.CalcTaskMapper;
import com.talent.label.mapper.CalcTaskRuleMapper;
import com.talent.label.mapper.EmployeeTagResultMapper;
import com.talent.label.mapper.TagRuleMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TagRuleServiceImplTest {

    @Mock
    private TagRuleMapper ruleMapper;
    @Mock
    private EmployeeTagResultMapper tagResultMapper;
    @Mock
    private CalcTaskRuleMapper taskRuleMapper;
    @Mock
    private CalcTaskMapper taskMapper;

    @InjectMocks
    private TagRuleServiceImpl service;

    @Test
    void rollback_should_block_when_related_task_running() {
        TagRule rule = new TagRule();
        rule.setId(300L);
        rule.setStatus("PUBLISHED");
        when(ruleMapper.selectById(300L)).thenReturn(rule);

        CalcTaskRule taskRule = new CalcTaskRule();
        taskRule.setRuleId(300L);
        taskRule.setTaskId(400L);
        when(taskRuleMapper.selectList(any())).thenReturn(List.of(taskRule));
        when(taskMapper.selectCount(any())).thenReturn(1L);

        assertThrows(BizException.class, () -> service.rollback(300L));
        verify(ruleMapper, never()).updateById(any(TagRule.class));
    }

    @Test
    void rollback_should_block_when_related_task_submitted_and_not_running() {
        TagRule rule = new TagRule();
        rule.setId(301L);
        rule.setStatus("PUBLISHED");
        when(ruleMapper.selectById(301L)).thenReturn(rule);

        CalcTaskRule taskRule = new CalcTaskRule();
        taskRule.setRuleId(301L);
        taskRule.setTaskId(401L);
        when(taskRuleMapper.selectList(any())).thenReturn(List.of(taskRule));
        when(taskMapper.selectCount(any())).thenReturn(0L, 1L);

        assertThrows(BizException.class, () -> service.rollback(301L));
        verify(ruleMapper, never()).updateById(any(TagRule.class));
    }
}
