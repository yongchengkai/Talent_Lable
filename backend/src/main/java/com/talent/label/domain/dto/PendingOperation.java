package com.talent.label.domain.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PendingOperation {
    private String operationId;
    private String type;
    private Long targetId;
    private String targetName;
    private String skillCode;
    private Map<String, Object> params;
    private Map<String, Object> impact;
    private boolean requiresConfirmation;
    private String status; // pending / confirmed / rejected / failed
    private String message;
    private Map<String, Object> accumulatedContext; // 工作流前序步骤的累积结果
    private boolean continueWorkflow; // 确认后是否需要继续执行后续步骤

    public static PendingOperation rejected(String message) {
        return PendingOperation.builder()
                .requiresConfirmation(false)
                .status("rejected")
                .message(message)
                .build();
    }
}
