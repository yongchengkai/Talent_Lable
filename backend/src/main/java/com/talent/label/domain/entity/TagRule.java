package com.talent.label.domain.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("tag_rule")
public class TagRule {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String ruleCode;
    private String ruleName;
    private String ruleType;
    private Integer priority;
    private String status;
    private Integer versionNo;
    private Long originRuleId;
    private String dslContent;
    private String dslExplain;
    private LocalDateTime effectiveStart;
    private LocalDateTime effectiveEnd;
    private LocalDateTime publishedAt;
    private String publishedBy;
    private String remark;
    private String createdBy;
    private String updatedBy;
    @TableLogic
    private Integer deleted;
    @TableField(exist = false)
    private Long formalTaskCount;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
