package com.talent.label.domain.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("ai_skill")
public class AiSkill {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String skillCode;
    private String skillName;
    private String category;
    private String description;
    private String whenToUse;
    private String toolName;
    private Boolean requiresConfirm;
    private Boolean enabled;
    private Integer sortOrder;

    private String createdBy;
    private String updatedBy;
    @TableLogic
    private Integer deleted;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
