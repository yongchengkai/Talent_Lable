package com.talent.label.domain.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("tag_rule_output")
public class TagRuleOutput {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long ruleId;
    private Long branchId;
    private Long tagId;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
