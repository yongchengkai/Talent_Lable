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
@Component("submitTask")
@RequiredArgsConstructor
public class SubmitTaskTool implements Function<SubmitTaskTool.Request, String> {

    private final CalcTaskService calcTaskService;
    private final AiPendingOperationMapper pendingOpMapper;
    private final ObjectMapper objectMapper;

    public record Request(
            @JsonProperty("taskId") @JsonPropertyDescription("要提交的任务ID") Long taskId
    ) {}

    @Override
    public String apply(Request request) {
        try {
            CalcTask task = calcTaskService.getById(request.taskId());
            if (task == null) {
                return "{\"error\": \"任务不存在，ID: " + request.taskId() + "\"}";
            }
            if (!"SUCCESS".equals(task.getTaskStatus())) {
                return "{\"error\": \"任务状态为" + task.getTaskStatus() + "，只有SUCCESS状态的任务可以提交\"}";
            }
            if (!"FORMAL".equals(task.getTaskMode())) {
                return "{\"error\": \"任务模式为" + task.getTaskMode() + "，只有FORMAL模式的任务可以提交\"}";
            }

            String desc = "提交任务「" + task.getTaskName() + "」的执行结果";

            Map<String, Object> opData = new LinkedHashMap<>();
            opData.put("taskId", request.taskId());

            AiPendingOperation pendingOp = new AiPendingOperation();
            pendingOp.setSessionId(SessionContext.get() != null ? SessionContext.get() : "unknown");
            pendingOp.setSkillCode("submit_task");
            pendingOp.setOperationDesc(desc);
            pendingOp.setOperationData(objectMapper.writeValueAsString(opData));
            pendingOp.setImpactSummary("提交后标签结果将持久化，命中" + task.getSuccessCount() + "人。提交后不可撤销。");
            pendingOp.setStatus("PENDING");
            pendingOp.setExpiresAt(LocalDateTime.now().plusMinutes(30));
            pendingOpMapper.insert(pendingOp);

            Map<String, Object> response = new LinkedHashMap<>();
            response.put("pendingOperationId", pendingOp.getId());
            response.put("operationDesc", desc);
            response.put("message", "操作已准备就绪，等待用户确认后执行。");
            return objectMapper.writeValueAsString(response);
        } catch (Exception e) {
            log.error("准备提交任务失败", e);
            return "{\"error\": \"准备提交任务失败: " + e.getMessage() + "\"}";
        }
    }
}
