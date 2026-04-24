package com.talent.label.domain.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("employee_field_registry")
public class EmployeeFieldRegistry {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String fieldCode;
    private String fieldName;
    private Boolean enabled;
    private Integer sortOrder;
    private LocalDateTime createdAt;
}
