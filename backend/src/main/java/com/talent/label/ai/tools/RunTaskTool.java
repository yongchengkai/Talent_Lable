package com.talent.label.ai.tools;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.talent.label.ai.SessionContext;
import com.talent.label.domain.entity.AiPendingOperation;
import com.talent.label.domain.entity.CalcTask;
import com.talent.label.mapper.AiPendingOperationMapper;
import com.talent.label.service.CalcTaskService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;

@Slf4j
@Component("runTask")
@RequiredArgsConstructor
public class RunTaskTool implements Function<RunTaskTool.Request, String> {

    private final CalcTaskService calcTaskService;
    private final AiPendingOperationMapper pendingOpMapper;
    private final ObjectMapper objectMapper;

    public record Request(
            @JsonProperty("taskId") @JsonPropertyDescription("要执行的任务ID") Long taskId
    ) {}

    @Override
    public String apply(Request request) {
        try {
            CalcTask task = calcTaskService.getById(request.taskId());
            if (task == null) {
                return "{\"error\": \"任务不存在，ID: " + request.taskId() + "\"}";
            }
            if (!"INIT".equals(task.getTaskStatus()) && !"FAILED".equals(task.getTaskStatus())) {
                return "{\"error\": \"任务当前状态为" + task.getTaskStatus() + "，只有INIT或FAILED状态的任务可以执行\"}";
            }

            String desc = "执行" + task.getTaskMode() + "打标任务「" + task.getTaskName() + "」";

            Map<String, Object> opData = new LinkedHashMap<>();
            opData.put("taskId", request.taskId());

            AiPendingOperation pendingOp = new AiPendingOperation();
            pendingOp.setSessionId(SessionContext.get() != null ? SessionContext.get() : "unknown");
            pendingOp.setSkillCode("run_task");
            pendingOp.setOperationDesc(desc);
            pendingOp.setOperationData(objectMapper.writeValueAsString(opData));
            pendingOp.setImpactSummary("将执行" + task.getTaskMode() + "模式的打标任务。");
            pendingOp.setStatus("PENDING");
            pendingOp.setExpiresAt(LocalDateTime.now().plusMinutes(30));
            pendingOpMapper.insert(pendingOp);

            Map<String, Object> response = new LinkedHashMap<>();
            response.put("pendingOperationId", pendingOp.getId());
            response.put("operationDesc", desc);
            response.put("message", "操作已准备就绪，等待用户确认后执行。");
            return objectMapper.writeValueAsString(response);
        } catch (Exception e) {
            log.error("准备执行任务失败", e);
            return "{\"error\": \"准备执行任务失败: " + e.getMessage() + "\"}";
        }
    }
}
