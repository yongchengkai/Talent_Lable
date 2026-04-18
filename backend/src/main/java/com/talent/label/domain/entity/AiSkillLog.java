package com.talent.label.domain.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("ai_skill_log")
public class AiSkillLog {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long skillId;
    private String sessionId;
    private String toolName;
    private String inputParams;
    private String outputResult;
    private Boolean success;
    private String errorMessage;
    private Integer durationMs;
    private String operatorId;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
