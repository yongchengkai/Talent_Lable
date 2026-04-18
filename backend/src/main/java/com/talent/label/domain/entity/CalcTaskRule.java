package com.talent.label.domain.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("calc_task_rule")
public class CalcTaskRule {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long taskId;
    private Long ruleId;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
