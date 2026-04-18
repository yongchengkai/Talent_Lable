package com.talent.label.domain.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("tag_rule_condition")
public class TagRuleCondition {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long ruleId;
    private Long branchId;
    private Integer groupNo;
    private String logicOperator;
    private String fieldCode;
    private String fieldName;
    private String operator;
    private String valueType;
    private String valueExpr;
    private Integer sortOrder;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
