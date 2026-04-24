package com.talent.label.domain.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("ai_widget_type")
public class AiWidgetType {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String widgetCode;
    private String widgetName;
    private String category;
    private String description;
    private String paramDesc;
    private Boolean enabled;
    private Integer sortOrder;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
