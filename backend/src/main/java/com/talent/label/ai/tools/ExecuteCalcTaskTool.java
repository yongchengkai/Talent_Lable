package com.talent.label.ai.tools;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.talent.label.domain.entity.*;
import com.talent.label.mapper.*;
import com.talent.label.service.CalcTaskService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Component("executeCalcTask")
@RequiredArgsConstructor
public class ExecuteCalcTaskTool implements Function<ExecuteCalcTaskTool.Request, String> {

    private final CalcTaskService calcTaskService;
    private final CalcTaskMapper taskMapper;
    private final CalcTaskRuleMapper taskRuleMapper;
    private final TagRuleMapper ruleMapper;
    private final EmployeeMapper employeeMapper;
    private final ObjectMapper objectMapper;

    public record Request(
            @JsonProperty("action")
            @JsonPropertyDescription("操作类型：CREATE_AND_RUN（创建并运行任务）、RUN（运行已有任务）、STATUS（查询任务状态）")
            String action,

            @JsonProperty("taskId")
            @JsonPropertyDescription("任务ID，RUN和STATUS操作时必填")
            Long taskId,

            @JsonProperty("taskName")
            @JsonPropertyDescription("任务名称，CREATE_AND_RUN时必填")
            String taskName,

            @JsonProperty("taskMode")
            @JsonPropertyDescription("任务模式：SIMULATION（模拟打标）或 FORMAL（正式打标），CREATE_AND_RUN时必填")
            String taskMode,

            @JsonProperty("ruleIds")
            @JsonPropertyDescription("规则ID列表，CREATE_AND_RUN时必填")
            List<Long> ruleIds
    ) {}

    @Override
    public String apply(Request request) {
        try {
            return switch (request.action().toUpperCase()) {
                case "CREATE_AND_RUN" -> createAndRun(request);
                case "RUN" -> runTask(request.taskId());
                case "STATUS" -> getStatus(request.taskId());
                default -> toJson(Map.of("error", "不支持的操作: " + request.action()));
            };
        } catch (Exception e) {
            log.error("执行打标任务失败", e);
            return toJson(Map.of("error", e.getMessage()));
        }
    }

    private String createAndRun(Request request) {
        if (request.taskName() == null || request.taskName().isBlank()) {
            return toJson(Map.of("error", "任务名称不能为空"));
        }
        if (request.ruleIds() == null || request.ruleIds().isEmpty()) {
            return toJson(Map.of("error", "请指定至少一条规则"));
        }
        String mode = request.taskMode() != null ? request.taskMode().toUpperCase() : "SIMULATION";
        if (!"SIMULATION".equals(mode) && !"FORMAL".equals(mode)) {
            return toJson(Map.of("error", "taskMode 必须是 SIMULATION 或 FORMAL"));
        }

        // 校验规则存在且已发布（正式打标要求已发布）
        List<TagRule> rules = ruleMapper.selectBatchIds(request.ruleIds());
        if (rules.size() != request.ruleIds().size()) {
            return toJson(Map.of("error", "部分规则ID不存在"));
        }
        if ("FORMAL".equals(mode)) {
            List<String> unpublished = rules.stream()
                    .filter(r -> !"PUBLISHED".equals(r.getStatus()))
                    .map(TagRule::getRuleName)
                    .toList();
            if (!unpublished.isEmpty()) {
                return toJson(Map.of("error", "正式打标要求所有规则已发布，以下规则未发布: " + String.join("、", unpublished)));
            }
        }

        // 创建任务
        CalcTask task = new CalcTask();
        task.setTaskName(request.taskName());
        task.setTaskType("FULL");
        task.setTaskMode(mode);
        task.setTriggeredBy("AI");
        task.setTriggerType("MANUAL");
        CalcTask created = calcTaskService.create(task, request.ruleIds());

        // 运行任务
        calcTaskService.run(created.getId());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("taskId", created.getId());
        result.put("taskNo", created.getTaskNo());
        result.put("taskName", created.getTaskName());
        result.put("taskMode", mode);
        result.put("taskStatus", "RUNNING");
        result.put("ruleCount", request.ruleIds().size());
        result.put("ruleNames", rules.stream().map(TagRule::getRuleName).toList());
        result.put("message", "SIMULATION".equals(mode)
                ? "模拟打标任务已创建并开始运行，运行完成后可查看结果"
                : "正式打标任务已创建并开始运行，运行成功后需提交才会写入正式数据");

        return toJson(result);
    }

    private String runTask(Long taskId) {
        if (taskId == null) return toJson(Map.of("error", "taskId 不能为空"));
        calcTaskService.run(taskId);

        CalcTask task = calcTaskService.getById(taskId);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("taskId", taskId);
        result.put("taskNo", task.getTaskNo());
        result.put("taskStatus", task.getTaskStatus());
        result.put("message", "任务已开始运行");
        return toJson(result);
    }

    private String getStatus(Long taskId) {
        if (taskId == null) return toJson(Map.of("error", "taskId 不能为空"));
        CalcTask task = calcTaskService.getById(taskId);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("taskId", taskId);
        result.put("taskNo", task.getTaskNo());
        result.put("taskName", task.getTaskName());
        result.put("taskMode", task.getTaskMode());
        result.put("taskStatus", task.getTaskStatus());
        result.put("submitStatus", task.getSubmitStatus());
        result.put("totalCount", task.getTotalCount());
        result.put("successCount", task.getSuccessCount());
        result.put("failCount", task.getFailCount());
        result.put("startTime", task.getStartTime());
        result.put("endTime", task.getEndTime());
        if (task.getErrorMessage() != null) result.put("errorMessage", task.getErrorMessage());

        // 获取关联规则
        List<CalcTaskRule> taskRules = taskRuleMapper.selectList(
                new LambdaQueryWrapper<CalcTaskRule>().eq(CalcTaskRule::getTaskId, taskId));
        if (!taskRules.isEmpty()) {
            List<Long> ruleIds = taskRules.stream().map(CalcTaskRule::getRuleId).toList();
            List<TagRule> rules = ruleMapper.selectBatchIds(ruleIds);
            result.put("rules", rules.stream().map(r -> Map.of(
                    "ruleId", r.getId(),
                    "ruleName", r.getRuleName(),
                    "ruleType", r.getRuleType()
            )).toList());
        }

        return toJson(result);
    }

    private String toJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return "{\"error\":\"JSON序列化失败\"}";
        }
    }
}
