package com.talent.label.ai.tools;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.talent.label.domain.entity.CalcTask;
import com.talent.label.mapper.CalcTaskMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.*;
import java.util.function.Function;

@Slf4j
@Component("searchTasks")
@RequiredArgsConstructor
public class SearchTasksTool implements Function<SearchTasksTool.Request, String> {

    private final CalcTaskMapper calcTaskMapper;
    private final ObjectMapper objectMapper;

    public record Request(
            @JsonProperty("keyword") @JsonPropertyDescription("搜索关键词，匹配任务名称或编号") String keyword,
            @JsonProperty("taskMode") @JsonPropertyDescription("任务模式: SIMULATION/FORMAL") String taskMode,
            @JsonProperty("taskStatus") @JsonPropertyDescription("任务状态: INIT/RUNNING/SUCCESS/FAILED") String taskStatus
    ) {}

    @Override
    public String apply(Request request) {
        try {
            LambdaQueryWrapper<CalcTask> wrapper = new LambdaQueryWrapper<>();
            if (StringUtils.hasText(request.keyword())) {
                wrapper.and(w -> w.like(CalcTask::getTaskName, request.keyword())
                        .or().like(CalcTask::getTaskNo, request.keyword()));
            }
            if (StringUtils.hasText(request.taskMode())) {
                wrapper.eq(CalcTask::getTaskMode, request.taskMode());
            }
            if (StringUtils.hasText(request.taskStatus())) {
                wrapper.eq(CalcTask::getTaskStatus, request.taskStatus());
            }
            wrapper.orderByDesc(CalcTask::getCreatedAt);

            Page<CalcTask> page = calcTaskMapper.selectPage(new Page<>(1, 20), wrapper);
            List<Map<String, Object>> results = new ArrayList<>();
            for (CalcTask task : page.getRecords()) {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("id", task.getId());
                item.put("taskNo", task.getTaskNo());
                item.put("taskName", task.getTaskName());
                item.put("taskMode", task.getTaskMode());
                item.put("taskStatus", task.getTaskStatus());
                item.put("submitStatus", task.getSubmitStatus());
                item.put("totalCount", task.getTotalCount());
                item.put("successCount", task.getSuccessCount());
                item.put("failCount", task.getFailCount());
                results.add(item);
            }

            Map<String, Object> response = new LinkedHashMap<>();
            response.put("total", page.getTotal());
            response.put("tasks", results);
            return objectMapper.writeValueAsString(response);
        } catch (Exception e) {
            log.error("搜索任务失败", e);
            return "{\"error\": \"搜索任务失败: " + e.getMessage() + "\"}";
        }
    }
}
