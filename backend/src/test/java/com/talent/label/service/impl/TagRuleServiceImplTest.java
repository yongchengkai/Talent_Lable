package com.talent.label.service.impl;

import com.talent.label.common.BizException;
import com.talent.label.domain.entity.CalcTaskRule;
import com.talent.label.domain.entity.TagDefinition;
import com.talent.label.domain.entity.TagRule;
import com.talent.label.domain.entity.TagRuleOutput;
import com.talent.label.mapper.CalcTaskMapper;
import com.talent.label.mapper.CalcTaskRuleMapper;
import com.talent.label.mapper.EmployeeTagResultMapper;
import com.talent.label.mapper.TagDefinitionMapper;
import com.talent.label.mapper.TagRuleMapper;
import com.talent.label.mapper.TagRuleOutputMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
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
    @Mock
    private TagRuleOutputMapper ruleOutputMapper;
    @Mock
    private TagDefinitionMapper tagDefinitionMapper;

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

    @Test
    void create_should_sync_rule_outputs_from_dsl() {
        TagRule rule = new TagRule();
        rule.setRuleCode("CR_AGE_GROUP");
        rule.setRuleType("STRUCTURED");
        rule.setDslContent("多分支：#{20-25岁（TAG_AGE_20_25）}，#{26-30岁（TAG_AGE_26_30）}");

        when(ruleMapper.selectCount(any())).thenReturn(0L);
        doAnswer(invocation -> {
            TagRule target = invocation.getArgument(0);
            target.setId(500L);
            return 1;
        }).when(ruleMapper).insert(any(TagRule.class));

        TagDefinition t1 = new TagDefinition();
        t1.setId(11L);
        t1.setTagCode("TAG_AGE_20_25");
        TagDefinition t2 = new TagDefinition();
        t2.setId(12L);
        t2.setTagCode("TAG_AGE_26_30");
        when(tagDefinitionMapper.selectList(any())).thenReturn(List.of(t1, t2));

        service.create(rule);

        verify(ruleOutputMapper).delete(any());
        ArgumentCaptor<TagRuleOutput> captor = ArgumentCaptor.forClass(TagRuleOutput.class);
        verify(ruleOutputMapper, times(2)).insert(captor.capture());
        Set<Long> tagIds = captor.getAllValues().stream().map(TagRuleOutput::getTagId).collect(Collectors.toSet());
        assertEquals(Set.of(11L, 12L), tagIds);
    }

    @Test
    void update_should_resync_rule_outputs_from_dsl() {
        TagRule existing = new TagRule();
        existing.setId(600L);
        existing.setRuleCode("CR_TEST");
        existing.setRuleType("STRUCTURED");
        when(ruleMapper.selectById(600L)).thenReturn(existing);
        when(taskRuleMapper.selectList(any())).thenReturn(List.of());

        TagRule update = new TagRule();
        update.setRuleName("测试规则");
        update.setRuleType("STRUCTURED");
        update.setPriority(1);
        update.setDslContent("#{31-35岁（TAG_AGE_31_35）}");
        update.setDslExplain("说明");
        update.setRemark("备注");
        update.setUpdatedBy("tester");

        TagDefinition t = new TagDefinition();
        t.setId(13L);
        t.setTagCode("TAG_AGE_31_35");
        when(tagDefinitionMapper.selectList(any())).thenReturn(List.of(t));

        service.update(600L, update);

        verify(ruleMapper).updateById(any(TagRule.class));
        verify(ruleOutputMapper).delete(any());
        ArgumentCaptor<TagRuleOutput> captor = ArgumentCaptor.forClass(TagRuleOutput.class);
        verify(ruleOutputMapper).insert(captor.capture());
        assertEquals(13L, captor.getValue().getTagId());
        assertEquals(600L, captor.getValue().getRuleId());
    }
}
