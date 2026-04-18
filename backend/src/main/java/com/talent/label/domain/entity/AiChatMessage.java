package com.talent.label.domain.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("ai_chat_message")
public class AiChatMessage {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String sessionId;
    private String role;
    private String content;
    private String pendingOp;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
