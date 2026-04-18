package com.talent.label.domain.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("tag_definition")
public class TagDefinition {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String tagCode;
    private String tagName;
    private Long categoryId;
    private String tagSource;
    private String status;
    private String description;
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
