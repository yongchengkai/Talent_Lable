package com.talent.label.domain.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("operation_log")
public class OperationLog {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String bizType;
    private String bizId;
    private String operationType;
    private String operationBefore;
    private String operationAfter;
    private String operatorId;
    private String operatorName;
    private LocalDateTime operatedAt;
}
