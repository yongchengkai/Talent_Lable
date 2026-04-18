package com.talent.label.domain.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("tag_category")
public class TagCategory {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String categoryCode;
    private String categoryName;
    private String status;
    private String description;
    private Integer sortOrder;
    private String createdBy;
    private String updatedBy;
    @TableLogic
    private Integer deleted;
    @TableField(exist = false)
    private Long tagCount;
    @TableField(exist = false)
    private Long activeTagCount;
    @TableField(exist = false)
    private Long inactiveTagCount;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
