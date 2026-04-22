package com.talent.label.ai.tools;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.talent.label.domain.entity.CalcTask;
import com.talent.label.service.CalcTaskService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.function.Function;

@Slf4j
@Component("manageTask")
@RequiredArgsConstructor
public class ManageTaskTool implements Function<ManageTaskTool.Request, String> {

    private final CalcTaskService taskService;
    private final ObjectMapper objectMapper;

    public record Request(
            @JsonProperty("action") @JsonPropertyDescription("操作类型：list/get/create/update/run/submit/revoke/delete") String action,
            @JsonProperty("id") @JsonPropertyDescription("任务ID（get/update/run/submit/revoke/delete时必填）") Long id,
            @JsonProperty("keyword") @JsonPropertyDescription("搜索关键词（list时可选）") String keyword,
            @JsonProperty("taskMode") @JsonPropertyDescription("任务模式筛选：SIMULATION/FORMAL（list时可选）") String taskMode,
            @JsonProperty("taskStatus") @JsonPropertyDescription("任务状态筛选：INIT/RUNNING/SUCCESS/FAILED（list时可选）") String taskStatus,
            @JsonProperty("submitStatus") @JsonPropertyDescription("提交状态筛选：PENDING/SUBMITTED（list时可选）") String submitStatus,
            @JsonProperty("taskName") @JsonPropertyDescription("任务名称（create/update时必填）") String taskName,
            @JsonProperty("taskModeValue") @JsonPropertyDescription("任务模式：SIMULATION/FORMAL（create时必填）") String taskModeValue,
            @JsonProperty("ruleIds") @JsonPropertyDescription("关联规则ID列表（create/update时必填）") List<Long> ruleIds
    ) {}

    @Override
    public String apply(Request req) {
        try {
            return switch (req.action()) {
                case "list" -> doList(req);
                case "get" -> doGet(req);
                case "create" -> doCreate(req);
                case "update" -> doUpdate(req);
                case "run" -> doRun(req.id());
                case "submit" -> doSubmit(req.id());
                case "revoke" -> doRevoke(req.id());
                case "delete" -> doDelete(req.id());
                default -> toJson(Map.of("error", "不支持的操作: " + req.action()));
            };
        } catch (Exception e) {
            return toJson(Map.of("error", e.getMessage()));
        }
    }

    private String doList(Request req) {
        Page<CalcTask> page = taskService.page(1, 50, req.keyword(), req.taskMode(), req.taskStatus(), req.submitStatus());
        List<Map<String, Object>> list = page.getRecords().stream().map(t -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", t.getId());
            m.put("taskNo", t.getTaskNo());
            m.put("taskName", t.getTaskName());
            m.put("taskMode", t.getTaskMode());
            m.put("taskStatus", t.getTaskStatus());
            m.put("submitStatus", t.getSubmitStatus());
            m.put("totalCount", t.getTotalCount());
            m.put("successCount", t.getSuccessCount());
            m.put("failCount", t.getFailCount());
            return m;
        }).toList();
        return toJson(Map.of("total", page.getTotal(), "records", list));
    }

    private String doGet(Request req) {
        CalcTask t = taskService.getById(req.id());
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", t.getId());
        m.put("taskNo", t.getTaskNo());
        m.put("taskName", t.getTaskName());
        m.put("taskMode", t.getTaskMode());
        m.put("taskStatus", t.getTaskStatus());
        m.put("submitStatus", t.getSubmitStatus());
        m.put("totalCount", t.getTotalCount());
        m.put("successCount", t.getSuccessCount());
        m.put("failCount", t.getFailCount());
        m.put("startTime", t.getStartTime());
        m.put("endTime", t.getEndTime());
        m.put("errorMessage", t.getErrorMessage());
        return toJson(m);
    }

    private String doCreate(Request req) {
        CalcTask t = new CalcTask();
        t.setTaskName(req.taskName());
        t.setTaskMode(req.taskModeValue());
        t.setTriggeredBy("ai");
        CalcTask created = taskService.create(t, req.ruleIds());
        return toJson(Map.of("success", true, "id", created.getId(), "taskNo", created.getTaskNo(), "message", "任务创建成功"));
    }

    private String doUpdate(Request req) {
        CalcTask t = new CalcTask();
        t.setTaskName(req.taskName());
        taskService.update(req.id(), t, req.ruleIds());
        return toJson(Map.of("success", true, "message", "任务更新成功"));
    }

    private String doRun(Long id) {
        taskService.run(id);
        return toJson(Map.of("success", true, "message", "任务已开始运行"));
    }

    private String doSubmit(Long id) {
        taskService.submit(id);
        return toJson(Map.of("success", true, "message", "任务已提交审批"));
    }

    private String doRevoke(Long id) {
        taskService.revoke(id);
        return toJson(Map.of("success", true, "message", "任务已撤销"));
    }

    private String doDelete(Long id) {
        taskService.delete(id);
        return toJson(Map.of("success", true, "message", "任务已删除"));
    }

    private String toJson(Object obj) {
        try { return objectMapper.writeValueAsString(obj); }
        catch (Exception e) { return "{\"error\":\"JSON序列化失败\"}"; }
    }
}
