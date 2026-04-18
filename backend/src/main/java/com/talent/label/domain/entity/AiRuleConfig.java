package com.talent.label.domain.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("ai_rule_config")
public class AiRuleConfig {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long ruleId;
    private String inputFields;
    private String promptTemplate;
    private String modelName;
    private BigDecimal temperature;
    private Integer maxTokens;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
