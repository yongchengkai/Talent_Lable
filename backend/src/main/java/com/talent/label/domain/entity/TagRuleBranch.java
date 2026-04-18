package com.talent.label.domain.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("tag_rule_branch")
public class TagRuleBranch {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long ruleId;
    private String branchName;
    private Integer sortOrder;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
