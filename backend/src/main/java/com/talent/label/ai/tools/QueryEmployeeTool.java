package com.talent.label.ai.tools;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.talent.label.domain.entity.Employee;
import com.talent.label.domain.entity.EmployeeTagResult;
import com.talent.label.domain.entity.TagDefinition;
import com.talent.label.mapper.EmployeeMapper;
import com.talent.label.mapper.EmployeeTagResultMapper;
import com.talent.label.mapper.TagDefinitionMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Component("queryEmployee")
@RequiredArgsConstructor
public class QueryEmployeeTool implements Function<QueryEmployeeTool.Request, String> {

    private final EmployeeMapper employeeMapper;
    private final EmployeeTagResultMapper tagResultMapper;
    private final TagDefinitionMapper tagDefinitionMapper;
    private final ObjectMapper objectMapper;

    public record Request(
            @JsonProperty("action") @JsonPropertyDescription("操作类型：list/get/orgTree") String action,
            @JsonProperty("id") @JsonPropertyDescription("员工ID（get时必填）") Long id,
            @JsonProperty("keyword") @JsonPropertyDescription("搜索关键词：姓名或工号（list时可选）") String keyword,
            @JsonProperty("orgId") @JsonPropertyDescription("组织ID筛选（list时可选）") Long orgId,
            @JsonProperty("gradeLevel") @JsonPropertyDescription("职级筛选（list时可选）") String gradeLevel
    ) {}

    @Override
    public String apply(Request req) {
        try {
            return switch (req.action()) {
                case "list" -> doList(req);
                case "get" -> doGet(req);
                case "orgTree" -> doOrgTree();
                default -> toJson(Map.of("error", "不支持的操作: " + req.action()));
            };
        } catch (Exception e) {
            return toJson(Map.of("error", e.getMessage()));
        }
    }

    private String doList(Request req) {
        LambdaQueryWrapper<Employee> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(req.keyword())) {
            wrapper.and(w -> w.like(Employee::getName, req.keyword())
                    .or().like(Employee::getEmployeeNo, req.keyword()));
        }
        if (req.orgId() != null) wrapper.eq(Employee::getOrgId, req.orgId());
        if (StringUtils.hasText(req.gradeLevel())) wrapper.eq(Employee::getGradeLevel, req.gradeLevel());
        wrapper.orderByDesc(Employee::getCreatedAt);

        Page<Employee> page = employeeMapper.selectPage(new Page<>(1, 50), wrapper);
        List<Map<String, Object>> list = page.getRecords().stream().map(e -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", e.getId());
            m.put("employeeNo", e.getEmployeeNo());
            m.put("name", e.getName());
            m.put("orgName", e.getOrgName());
            m.put("gradeLevel", e.getGradeLevel());
            m.put("jobTitle", e.getJobTitle());
            m.put("employeeStatus", e.getEmployeeStatus());
            return m;
        }).toList();
        return toJson(Map.of("total", page.getTotal(), "records", list));
    }

    private String doGet(Request req) {
        Employee e = employeeMapper.selectById(req.id());
        if (e == null) return toJson(Map.of("error", "员工不存在"));

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", e.getId());
        m.put("employeeNo", e.getEmployeeNo());
        m.put("name", e.getName());
        m.put("orgName", e.getOrgName());
        m.put("gradeLevel", e.getGradeLevel());
        m.put("jobTitle", e.getJobTitle());
        m.put("education", e.getEducation());
        m.put("university", e.getUniversity());
        m.put("hireDate", e.getHireDate());
        m.put("employeeStatus", e.getEmployeeStatus());

        // 查询有效标签
        List<EmployeeTagResult> results = tagResultMapper.selectList(
                new LambdaQueryWrapper<EmployeeTagResult>()
                        .eq(EmployeeTagResult::getEmployeeId, e.getId())
                        .eq(EmployeeTagResult::getValidFlag, true));
        if (!results.isEmpty()) {
            List<Long> tagIds = results.stream().map(EmployeeTagResult::getTagId).toList();
            List<TagDefinition> tags = tagDefinitionMapper.selectBatchIds(tagIds);
            Map<Long, TagDefinition> tagMap = tags.stream().collect(Collectors.toMap(TagDefinition::getId, t -> t));
            List<Map<String, Object>> tagList = results.stream().map(r -> {
                Map<String, Object> tm = new LinkedHashMap<>();
                tm.put("tagId", r.getTagId());
                TagDefinition td = tagMap.get(r.getTagId());
                tm.put("tagName", td != null ? td.getTagName() : "未知");
                tm.put("tagCode", td != null ? td.getTagCode() : "");
                tm.put("hitTime", r.getHitTime());
                return tm;
            }).toList();
            m.put("activeTags", tagList);
            m.put("activeTagCount", tagList.size());
        } else {
            m.put("activeTags", List.of());
            m.put("activeTagCount", 0);
        }
        return toJson(m);
    }

    private String doOrgTree() {
        // 获取所有不同的组织
        List<Employee> employees = employeeMapper.selectList(
                new LambdaQueryWrapper<Employee>().select(Employee::getOrgId, Employee::getOrgName).groupBy(Employee::getOrgId, Employee::getOrgName));
        List<Map<String, Object>> orgs = employees.stream().map(e -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("orgId", e.getOrgId());
            m.put("orgName", e.getOrgName());
            return m;
        }).toList();
        return toJson(Map.of("total", orgs.size(), "organizations", orgs));
    }

    private String toJson(Object obj) {
        try { return objectMapper.writeValueAsString(obj); }
        catch (Exception e) { return "{\"error\":\"JSON序列化失败\"}"; }
    }
}
