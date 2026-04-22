package com.talent.label.service.impl;

import com.talent.label.common.BizException;
import com.talent.label.domain.entity.TagDefinition;
import com.talent.label.mapper.EmployeeTagResultDetailMapper;
import com.talent.label.mapper.EmployeeTagResultMapper;
import com.talent.label.mapper.TagDefinitionMapper;
import com.talent.label.mapper.TagRuleMapper;
import com.talent.label.mapper.TagRuleOutputMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TagDefinitionServiceImplTest {

    @Mock
    private TagDefinitionMapper tagMapper;
    @Mock
    private TagRuleOutputMapper ruleOutputMapper;
    @Mock
    private TagRuleMapper ruleMapper;
    @Mock
    private EmployeeTagResultMapper tagResultMapper;
    @Mock
    private EmployeeTagResultDetailMapper tagResultDetailMapper;

    @InjectMocks
    private TagDefinitionServiceImpl service;

    @Test
    void delete_should_allow_active_tag_when_no_reference() {
        TagDefinition tag = new TagDefinition();
        tag.setId(100L);
        tag.setStatus("ACTIVE");
        tag.setTagCode("TAG_TEST");
        when(tagMapper.selectById(100L)).thenReturn(tag);
        when(ruleOutputMapper.selectCount(any())).thenReturn(0L);
        when(ruleMapper.selectCount(any())).thenReturn(0L);
        when(tagResultMapper.selectCount(any())).thenReturn(0L);
        when(tagResultDetailMapper.selectCount(any())).thenReturn(0L);

        assertDoesNotThrow(() -> service.delete(100L));
        verify(tagMapper).deleteById(100L);
    }

    @Test
    void delete_should_block_when_tag_is_referenced_by_rule() {
        TagDefinition tag = new TagDefinition();
        tag.setId(101L);
        tag.setStatus("ACTIVE");
        tag.setTagCode("TAG_REF");
        when(tagMapper.selectById(101L)).thenReturn(tag);
        when(ruleOutputMapper.selectCount(any())).thenReturn(1L);

        assertThrows(BizException.class, () -> service.delete(101L));
    }

    @Test
    void delete_should_block_when_tag_has_history_result() {
        TagDefinition tag = new TagDefinition();
        tag.setId(102L);
        tag.setStatus("INACTIVE");
        tag.setTagCode("TAG_HISTORY");
        when(tagMapper.selectById(102L)).thenReturn(tag);
        when(ruleOutputMapper.selectCount(any())).thenReturn(0L);
        when(ruleMapper.selectCount(any())).thenReturn(0L);
        when(tagResultMapper.selectCount(any())).thenReturn(1L);
        when(tagResultDetailMapper.selectCount(any())).thenReturn(0L);

        assertThrows(BizException.class, () -> service.delete(102L));
    }

    @Test
    void updateStatus_should_block_inactive_when_tag_is_referenced_by_rule() {
        TagDefinition tag = new TagDefinition();
        tag.setId(200L);
        tag.setStatus("ACTIVE");
        tag.setTagCode("TAG_REF");
        when(tagMapper.selectById(200L)).thenReturn(tag);
        when(ruleOutputMapper.selectCount(any())).thenReturn(1L);
        when(ruleMapper.selectCount(any())).thenReturn(0L);

        assertThrows(BizException.class, () -> service.updateStatus(200L, "INACTIVE"));
        verify(tagMapper, never()).updateById(any(TagDefinition.class));
    }

    @Test
    void updateStatus_should_allow_inactive_when_tag_has_no_rule_reference() {
        TagDefinition tag = new TagDefinition();
        tag.setId(201L);
        tag.setStatus("ACTIVE");
        tag.setTagCode("TAG_OK");
        when(tagMapper.selectById(201L)).thenReturn(tag);
        when(ruleOutputMapper.selectCount(any())).thenReturn(0L);
        when(ruleMapper.selectCount(any())).thenReturn(0L);

        assertDoesNotThrow(() -> service.updateStatus(201L, "INACTIVE"));
        verify(tagMapper).updateById(any(TagDefinition.class));
    }
}
