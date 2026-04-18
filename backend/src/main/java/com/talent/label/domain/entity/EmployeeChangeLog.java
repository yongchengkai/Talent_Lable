package com.talent.label.domain.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("employee_change_log")
public class EmployeeChangeLog {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long employeeId;
    private String employeeNo;
    private String changeType;
    private String fieldCode;
    private String oldValue;
    private String newValue;
    private Boolean processed;
    private LocalDateTime createdAt;
}
