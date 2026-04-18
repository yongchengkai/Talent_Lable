package com.talent.label.domain.dto;

import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
public class ChatRequest {
    private String sessionId;
    private String message;
    private ChatContext context;
}
