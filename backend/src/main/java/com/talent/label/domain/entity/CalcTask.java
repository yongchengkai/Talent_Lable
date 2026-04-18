package com.talent.label.domain.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("calc_task")
public class CalcTask {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String taskNo;
    private String taskName;
    private String taskType;
    private String taskMode;
    private String taskStatus;
    private String submitStatus;
    private String taskScope;
    private Integer totalCount;
    private Integer successCount;
    private Integer failCount;
    private String triggeredBy;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String errorMessage;
    private String triggerType;
    private Long notificationId;
    @TableLogic
    private Integer deleted;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
