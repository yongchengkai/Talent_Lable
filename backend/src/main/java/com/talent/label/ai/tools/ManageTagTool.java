package com.talent.label.ai.tools;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.talent.label.domain.entity.TagDefinition;
import com.talent.label.service.TagDefinitionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.function.Function;

@Slf4j
@Component("manageTag")
@RequiredArgsConstructor
public class ManageTagTool implements Function<ManageTagTool.Request, String> {

    private final TagDefinitionService tagService;
    private final ObjectMapper objectMapper;

    public record Request(
            @JsonProperty("action") @JsonPropertyDescription("操作类型：list/get/create/update/enable/disable/delete/migrate") String action,
            @JsonProperty("id") @JsonPropertyDescription("标签ID（get/update/enable/disable/delete时必填）") Long id,
            @JsonProperty("keyword") @JsonPropertyDescription("搜索关键词（list时可选）") String keyword,
            @JsonProperty("status") @JsonPropertyDescription("状态筛选：ACTIVE/INACTIVE（list时可选）") String status,
            @JsonProperty("categoryId") @JsonPropertyDescription("类目ID（list筛选/create时必填）") Long categoryId,
            @JsonProperty("tagCode") @JsonPropertyDescription("标签编码（create时必填）") String tagCode,
            @JsonProperty("tagName") @JsonPropertyDescription("标签名称（create/update时必填）") String tagName,
            @JsonProperty("tagSource") @JsonPropertyDescription("生成方式：DYNAMIC/STATIC_RULE/STATIC_AI（create时必填）") String tagSource,
            @JsonProperty("description") @JsonPropertyDescription("描述（create/update时可选）") String description,
            @JsonProperty("tagIds") @JsonPropertyDescription("标签ID列表（migrate时必填）") List<Long> tagIds,
            @JsonProperty("targetCategoryId") @JsonPropertyDescription("目标类目ID（migrate时必填）") Long targetCategoryId
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
                case "migrate" -> doMigrate(req);
                default -> toJson(Map.of("error", "不支持的操作: " + req.action()));
            };
        } catch (Exception e) {
            return toJson(Map.of("error", e.getMessage()));
        }
    }

    private String doList(Request req) {
        Page<TagDefinition> page = tagService.page(1, 50, req.keyword(), req.status(), req.categoryId());
        List<Map<String, Object>> list = page.getRecords().stream().map(t -> {
            Map<String, Object> m = new LinkedHashMap<>();
            List<Map<String, Object>> rules = tagService.getReferencingRules(t.getId());
            m.put("id", t.getId());
            m.put("tagCode", t.getTagCode());
            m.put("tagName", t.getTagName());
            m.put("categoryId", t.getCategoryId());
            m.put("tagSource", t.getTagSource());
            m.put("status", t.getStatus());
            m.put("referencingRuleCount", rules.size());
            m.put("referencedByRule", !rules.isEmpty());
            return m;
        }).toList();
        return toJson(Map.of("total", page.getTotal(), "records", list));
    }

    private String doGet(Request req) {
        TagDefinition t = tagService.getById(req.id());
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", t.getId());
        m.put("tagCode", t.getTagCode());
        m.put("tagName", t.getTagName());
        m.put("categoryId", t.getCategoryId());
        m.put("tagSource", t.getTagSource());
        m.put("status", t.getStatus());
        m.put("description", t.getDescription() != null ? t.getDescription() : "");
        // 附带引用规则信息
        List<Map<String, Object>> rules = tagService.getReferencingRules(t.getId());
        m.put("referencingRules", rules);
        m.put("referencingRuleCount", rules.size());
        return toJson(m);
    }

    private String doCreate(Request req) {
        TagDefinition t = new TagDefinition();
        t.setTagCode(req.tagCode());
        t.setTagName(req.tagName());
        t.setCategoryId(req.categoryId());
        t.setTagSource(req.tagSource());
        t.setDescription(req.description());
        t.setCreatedBy("ai");
        t.setUpdatedBy("ai");
        TagDefinition created = tagService.create(t);
        return toJson(Map.of("success", true, "id", created.getId(), "message", "标签创建成功"));
    }

    private String doUpdate(Request req) {
        TagDefinition t = new TagDefinition();
        t.setTagName(req.tagName());
        t.setDescription(req.description());
        if (req.categoryId() != null) t.setCategoryId(req.categoryId());
        t.setUpdatedBy("ai");
        tagService.update(req.id(), t);
        return toJson(Map.of("success", true, "message", "标签更新成功"));
    }

    private String doUpdateStatus(Long id, String status) {
        tagService.updateStatus(id, status);
        String label = "ACTIVE".equals(status) ? "启用" : "停用";
        return toJson(Map.of("success", true, "message", "标签已" + label));
    }

    private String doDelete(Long id) {
        tagService.delete(id);
        return toJson(Map.of("success", true, "message", "标签已删除"));
    }

    private String doMigrate(Request req) {
        tagService.migrate(req.tagIds(), req.targetCategoryId());
        return toJson(Map.of("success", true, "message", req.tagIds().size() + " 个标签已迁移"));
    }

    private String toJson(Object obj) {
        try { return objectMapper.writeValueAsString(obj); }
        catch (Exception e) { return "{\"error\":\"JSON序列化失败\"}"; }
    }
}
