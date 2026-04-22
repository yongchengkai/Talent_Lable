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
@Component("manageApproval")
@RequiredArgsConstructor
public class ManageApprovalTool implements Function<ManageApprovalTool.Request, String> {

    private final CalcTaskService taskService;
    private final ObjectMapper objectMapper;

    public record Request(
            @JsonProperty("action") @JsonPropertyDescription("操作类型：list/approve/reject") String action,
            @JsonProperty("id") @JsonPropertyDescription("任务ID（approve/reject时必填）") Long id
    ) {}

    @Override
    public String apply(Request req) {
        try {
            return switch (req.action()) {
                case "list" -> doList();
                case "approve" -> doApprove(req.id());
                case "reject" -> doReject(req.id());
                default -> toJson(Map.of("error", "不支持的操作: " + req.action()));
            };
        } catch (Exception e) {
            return toJson(Map.of("error", e.getMessage()));
        }
    }

    private String doList() {
        Page<CalcTask> page = taskService.page(1, 50, null, "FORMAL", "SUCCESS", "SUBMITTED");
        List<Map<String, Object>> list = page.getRecords().stream().map(t -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", t.getId());
            m.put("taskNo", t.getTaskNo());
            m.put("taskName", t.getTaskName());
            m.put("taskStatus", t.getTaskStatus());
            m.put("submitStatus", t.getSubmitStatus());
            m.put("totalCount", t.getTotalCount());
            m.put("successCount", t.getSuccessCount());
            return m;
        }).toList();
        return toJson(Map.of("total", page.getTotal(), "records", list));
    }

    private String doApprove(Long id) {
        taskService.approve(id);
        return toJson(Map.of("success", true, "message", "审批已通过，标签结果已正式生效"));
    }

    private String doReject(Long id) {
        taskService.reject(id);
        return toJson(Map.of("success", true, "message", "审批已驳回"));
    }

    private String toJson(Object obj) {
        try { return objectMapper.writeValueAsString(obj); }
        catch (Exception e) { return "{\"error\":\"JSON序列化失败\"}"; }
    }
}
