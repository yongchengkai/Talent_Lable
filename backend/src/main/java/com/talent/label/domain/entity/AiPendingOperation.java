package com.talent.label.domain.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("ai_pending_operation")
public class AiPendingOperation {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String sessionId;
    private String skillCode;
    private String operationDesc;
    private String operationData;
    private String impactSummary;
    private String status;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    private LocalDateTime expiresAt;
    @TableLogic
    private Integer deleted;
}
