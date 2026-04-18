package com.talent.label.service;

import com.talent.label.domain.dto.ChatContext;
import com.talent.label.domain.entity.AiChatMessage;
import com.talent.label.domain.entity.AiChatSession;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;

public interface ChatAssistantService {
    SseEmitter streamChat(String sessionId, String message, ChatContext context);
    AiChatSession createSession();
    List<AiChatSession> listSessions();
    List<AiChatMessage> getHistory(String sessionId);
    void deleteSession(String sessionId);
    Map<String, Object> confirmOperation(String sessionId, String operationId, boolean approved);
}
