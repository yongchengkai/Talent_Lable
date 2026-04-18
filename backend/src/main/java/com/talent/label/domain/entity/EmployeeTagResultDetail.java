package com.talent.label.domain.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("employee_tag_result_detail")
public class EmployeeTagResultDetail {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long taskId;
    private Long employeeId;
    private Long ruleId;
    private Long tagId;
    private String evidenceType;
    private Boolean scopeMatched;
    private String scopeSnapshot;
    private Boolean conditionMatched;
    private String conditionSnapshot;
    private String aiInputText;
    private String aiCandidates;
    private String aiExplanation;
    private BigDecimal aiConfidence;
    private String finalDecision;
    private String conflictReason;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
