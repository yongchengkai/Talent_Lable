package com.talent.label.ai.tools;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.talent.label.domain.entity.TagCategory;
import com.talent.label.service.TagCategoryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.function.Function;

@Slf4j
@Component("manageCategory")
@RequiredArgsConstructor
public class ManageCategoryTool implements Function<ManageCategoryTool.Request, String> {

    private final TagCategoryService categoryService;
    private final ObjectMapper objectMapper;

    public record Request(
            @JsonProperty("action") @JsonPropertyDescription("操作类型：list/get/create/update/enable/disable/delete") String action,
            @JsonProperty("id") @JsonPropertyDescription("类目ID（get/update/enable/disable/delete时必填）") Long id,
            @JsonProperty("keyword") @JsonPropertyDescription("搜索关键词（list时可选）") String keyword,
            @JsonProperty("status") @JsonPropertyDescription("状态筛选：ACTIVE/INACTIVE（list时可选）") String status,
            @JsonProperty("categoryCode") @JsonPropertyDescription("类目编码（create时必填）") String categoryCode,
            @JsonProperty("categoryName") @JsonPropertyDescription("类目名称（create/update时必填）") String categoryName,
            @JsonProperty("description") @JsonPropertyDescription("描述（create/update时可选）") String description
    ) {}

    @Override
    public String apply(Request req) {
        try {
            return switch (req.action()) {
                case "list" -> doList(req);
                case "get" -> doGet(req);
                case "create" -> doCreate(req);
                case "update" -> doUpdate(req);
                case "enable" -> doUpdateStatus(req.id(), "ACTIVE");
                case "disable" -> doUpdateStatus(req.id(), "INACTIVE");
                case "delete" -> doDelete(req.id());
                default -> toJson(Map.of("error", "不支持的操作: " + req.action()));
            };
        } catch (Exception e) {
            return toJson(Map.of("error", e.getMessage()));
        }
    }

    private String doList(Request req) {
        Page<TagCategory> page = categoryService.page(1, 50, req.keyword(), req.status());
        List<Map<String, Object>> list = page.getRecords().stream().map(c -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", c.getId());
            m.put("categoryCode", c.getCategoryCode());
            m.put("categoryName", c.getCategoryName());
            m.put("status", c.getStatus());
            m.put("description", c.getDescription());
            return m;
        }).toList();
        return toJson(Map.of("total", page.getTotal(), "records", list));
    }

    private String doGet(Request req) {
        TagCategory c = categoryService.getById(req.id());
        return toJson(Map.of("id", c.getId(), "categoryCode", c.getCategoryCode(),
                "categoryName", c.getCategoryName(), "status", c.getStatus(),
                "description", c.getDescription() != null ? c.getDescription() : ""));
    }

    private String doCreate(Request req) {
        TagCategory c = new TagCategory();
        c.setCategoryCode(req.categoryCode());
        c.setCategoryName(req.categoryName());
        c.setDescription(req.description());
        c.setCreatedBy("ai");
        c.setUpdatedBy("ai");
        TagCategory created = categoryService.create(c);
        return toJson(Map.of("success", true, "id", created.getId(), "message", "类目创建成功"));
    }

    private String doUpdate(Request req) {
        TagCategory c = new TagCategory();
        c.setCategoryName(req.categoryName());
        c.setDescription(req.description());
        c.setUpdatedBy("ai");
        categoryService.update(req.id(), c);
        return toJson(Map.of("success", true, "message", "类目更新成功"));
    }

    private String doUpdateStatus(Long id, String status) {
        categoryService.updateStatus(id, status);
        String label = "ACTIVE".equals(status) ? "启用" : "停用";
        return toJson(Map.of("success", true, "message", "类目已" + label));
    }

    private String doDelete(Long id) {
        categoryService.delete(id);
        return toJson(Map.of("success", true, "message", "类目已删除"));
    }

    private String toJson(Object obj) {
        try { return objectMapper.writeValueAsString(obj); }
        catch (Exception e) { return "{\"error\":\"JSON序列化失败\"}"; }
    }
}
