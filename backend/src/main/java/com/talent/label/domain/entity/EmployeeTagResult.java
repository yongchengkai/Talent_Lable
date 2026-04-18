package com.talent.label.domain.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("employee_tag_result")
public class EmployeeTagResult {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long employeeId;
    private Long tagId;
    private Long sourceRuleId;
    private Long taskId;
    private LocalDateTime hitTime;
    private Boolean validFlag;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
