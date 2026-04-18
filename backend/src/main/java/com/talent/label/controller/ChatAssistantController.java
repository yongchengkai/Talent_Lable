package com.talent.label.controller;

import com.talent.label.common.R;
import com.talent.label.domain.dto.ChatRequest;
import com.talent.label.domain.entity.AiChatMessage;
import com.talent.label.domain.entity.AiChatSession;
import com.talent.label.service.ChatAssistantService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/assistant")
@RequiredArgsConstructor
public class ChatAssistantController {

    private final ChatAssistantService chatAssistantService;

    @PostMapping(value = "/chat", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter chat(@RequestBody ChatRequest request) {
        return chatAssistantService.streamChat(
                request.getSessionId(),
                request.getMessage(),
                request.getContext());
    }

    @PostMapping("/sessions")
    public R<AiChatSession> createSession() {
        return R.ok(chatAssistantService.createSession());
    }

    @GetMapping("/sessions")
    public R<List<AiChatSession>> listSessions() {
        return R.ok(chatAssistantService.listSessions());
    }

    @GetMapping("/sessions/{sessionId}/messages")
    public R<List<AiChatMessage>> getHistory(@PathVariable String sessionId) {
        return R.ok(chatAssistantService.getHistory(sessionId));
    }

    @DeleteMapping("/sessions/{sessionId}")
    public R<Void> deleteSession(@PathVariable String sessionId) {
        chatAssistantService.deleteSession(sessionId);
        return R.ok(null);
    }

    @PostMapping("/sessions/{sessionId}/confirm/{operationId}")
    public R<Map<String, Object>> confirmOperation(@PathVariable String sessionId,
                                                    @PathVariable String operationId,
                                                    @RequestParam boolean approved) {
        return R.ok(chatAssistantService.confirmOperation(sessionId, operationId, approved));
    }
}
