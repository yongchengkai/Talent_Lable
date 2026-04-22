package com.talent.label.ai.tools;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.talent.label.domain.entity.TagRule;
import com.talent.label.service.TagRuleService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.function.Function;

@Slf4j
@Component("manageRule")
@RequiredArgsConstructor
public class ManageRuleTool implements Function<ManageRuleTool.Request, String> {

    private final TagRuleService ruleService;
    private final ObjectMapper objectMapper;

    public record Request(
            @JsonProperty("action") @JsonPropertyDescription("操作类型：list/get/create/update/publish/unpublish/copy/delete") String action,
            @JsonProperty("id") @JsonPropertyDescription("规则ID（get/update/publish/unpublish/copy/delete时必填）") Long id,
            @JsonProperty("keyword") @JsonPropertyDescription("搜索关键词（list时可选）") String keyword,
            @JsonProperty("status") @JsonPropertyDescription("发布状态筛选：UNPUBLISHED/PUBLISHED（list时可选）") String status,
            @JsonProperty("ruleType") @JsonPropertyDescription("规则类型筛选：STRUCTURED/AI_SEMANTIC（list时可选）") String ruleType,
            @JsonProperty("ruleCode") @JsonPropertyDescription("规则编码（create时必填，CR_或AR_前缀）") String ruleCode,
            @JsonProperty("ruleName") @JsonPropertyDescription("规则名称（create/update时必填）") String ruleName,
            @JsonProperty("ruleTypeValue") @JsonPropertyDescription("规则类型：STRUCTURED/AI_SEMANTIC（create时必填）") String ruleTypeValue,
            @JsonProperty("dslContent") @JsonPropertyDescription("规则DSL内容（create/update时可选）") String dslContent,
            @JsonProperty("dslExplain") @JsonPropertyDescription("规则解释（create/update时可选）") String dslExplain,
            @JsonProperty("remark") @JsonPropertyDescription("备注（create/update时可选）") String remark
    ) {}

    @Override
    public String apply(Request req) {
        try {
            return switch (req.action()) {
                case "list" -> doList(req);
                case "get" -> doGet(req);
                case "create" -> doCreate(req);
                case "update" -> doUpdate(req);
                case "publish" -> doPublish(req.id());
                case "unpublish" -> doUnpublish(req.id());
                case "copy" -> doCopy(req.id());
                case "delete" -> doDelete(req.id());
                default -> toJson(Map.of("error", "不支持的操作: " + req.action()));
            };
        } catch (Exception e) {
            return toJson(Map.of("error", e.getMessage()));
        }
    }

    private String doList(Request req) {
        Page<TagRule> page = ruleService.page(1, 50, req.keyword(), req.status(), req.ruleType());
        List<Map<String, Object>> list = page.getRecords().stream().map(r -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", r.getId());
            m.put("ruleCode", r.getRuleCode());
            m.put("ruleName", r.getRuleName());
            m.put("ruleType", r.getRuleType());
            m.put("status", r.getStatus());
            m.put("formalTaskCount", r.getFormalTaskCount());
            return m;
        }).toList();
        return toJson(Map.of("total", page.getTotal(), "records", list));
    }

    private String doGet(Request req) {
        TagRule r = ruleService.getById(req.id());
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", r.getId());
        m.put("ruleCode", r.getRuleCode());
        m.put("ruleName", r.getRuleName());
        m.put("ruleType", r.getRuleType());
        m.put("status", r.getStatus());
        m.put("versionNo", r.getVersionNo());
        m.put("dslContent", r.getDslContent());
        m.put("dslExplain", r.getDslExplain());
        m.put("remark", r.getRemark());
        m.put("publishedAt", r.getPublishedAt());
        // 附带正式任务引用
        List<Map<String, Object>> tasks = ruleService.getFormalTasks(r.getId());
        m.put("formalTasks", tasks);
        m.put("formalTaskCount", tasks.size());
        return toJson(m);
    }

    private String doCreate(Request req) {
        TagRule r = new TagRule();
        r.setRuleCode(req.ruleCode());
        r.setRuleName(req.ruleName());
        r.setRuleType(req.ruleTypeValue());
        r.setDslContent(req.dslContent());
        r.setDslExplain(req.dslExplain());
        r.setRemark(req.remark());
        r.setCreatedBy("ai");
        r.setUpdatedBy("ai");
        TagRule created = ruleService.create(r);
        return toJson(Map.of("success", true, "id", created.getId(), "message", "规则创建成功"));
    }

    private String doUpdate(Request req) {
        TagRule r = new TagRule();
        r.setRuleName(req.ruleName());
        r.setDslContent(req.dslContent());
        r.setDslExplain(req.dslExplain());
        r.setRemark(req.remark());
        r.setUpdatedBy("ai");
        ruleService.update(req.id(), r);
        return toJson(Map.of("success", true, "message", "规则更新成功"));
    }

    private String doPublish(Long id) {
        ruleService.publish(id);
        return toJson(Map.of("success", true, "message", "规则已发布"));
    }

    private String doUnpublish(Long id) {
        ruleService.stop(id);
        return toJson(Map.of("success", true, "message", "规则已撤销发布"));
    }

    private String doCopy(Long id) {
        TagRule copy = ruleService.copy(id);
        return toJson(Map.of("success", true, "id", copy.getId(), "ruleCode", copy.getRuleCode(), "message", "规则已复制"));
    }

    private String doDelete(Long id) {
        ruleService.delete(id);
        return toJson(Map.of("success", true, "message", "规则已删除"));
    }

    private String toJson(Object obj) {
        try { return objectMapper.writeValueAsString(obj); }
        catch (Exception e) { return "{\"error\":\"JSON序列化失败\"}"; }
    }
}
