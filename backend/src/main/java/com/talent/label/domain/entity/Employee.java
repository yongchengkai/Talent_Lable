package com.talent.label.domain.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@TableName("employee")
public class Employee {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String employeeNo;
    private String name;
    private Long orgId;
    private String orgName;
    private String orgPath;
    private String positionSequenceCode;
    private String positionSequenceName;
    private String jobFamilyCode;
    private String jobFamilyName;
    private String jobTitle;
    private String gradeLevel;
    private LocalDate birthDate;
    private LocalDate hireDate;
    private String education;
    private String university;
    private String resumeText;
    private String projectExperience;
    private String employmentType;
    private String employeeStatus;
    @TableLogic
    private Integer deleted;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
