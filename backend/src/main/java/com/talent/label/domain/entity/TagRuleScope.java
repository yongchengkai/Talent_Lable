package com.talent.label.domain.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("tag_rule_scope")
public class TagRuleScope {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long ruleId;
    private String scopeType;
    private String scopeValue;
    private String scopeName;
    private Boolean includeChildren;
    private Integer sortOrder;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
