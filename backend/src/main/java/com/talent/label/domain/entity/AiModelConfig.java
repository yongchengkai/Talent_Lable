package com.talent.label.domain.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("ai_model_config")
public class AiModelConfig {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String modelCode;
    private String modelName;
    private String provider;
    private String apiKey;
    private String baseUrl;
    private BigDecimal temperature;
    private Integer maxTokens;
    private Boolean isDefault;
    private String status;
    private String createdBy;
    private String updatedBy;
    @TableLogic
    private Integer deleted;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
