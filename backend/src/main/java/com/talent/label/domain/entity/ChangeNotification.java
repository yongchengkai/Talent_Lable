package com.talent.label.domain.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("change_notification")
public class ChangeNotification {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long employeeId;
    private String employeeNo;
    private String employeeName;
    private String changeType;
    private String changeSummary;
    private String changedFields;
    private String affectedRules;
    private String severity;
    private String status;
    private Long processedTaskId;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    private LocalDateTime readAt;
    @TableLogic
    private Integer deleted;
}
