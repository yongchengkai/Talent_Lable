package com.talent.label.ai.tools;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.talent.label.domain.entity.Employee;
import com.talent.label.mapper.EmployeeMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.*;
import java.util.function.Function;

@Slf4j
@Component("searchEmployees")
@RequiredArgsConstructor
public class SearchEmployeesTool implements Function<SearchEmployeesTool.Request, String> {

    private final EmployeeMapper employeeMapper;
    private final ObjectMapper objectMapper;

    public record Request(
            @JsonProperty("keyword") @JsonPropertyDescription("搜索关键词，匹配姓名或工号") String keyword,
            @JsonProperty("gradeLevel") @JsonPropertyDescription("职级过滤，如 P7、P8") String gradeLevel,
            @JsonProperty("orgName") @JsonPropertyDescription("组织名称") String orgName,
            @JsonProperty("positionSequenceName") @JsonPropertyDescription("岗位序列名称") String positionSequenceName
    ) {}

    @Override
    public String apply(Request request) {
        try {
            LambdaQueryWrapper<Employee> wrapper = new LambdaQueryWrapper<>();
            if (StringUtils.hasText(request.keyword())) {
                wrapper.and(w -> w.like(Employee::getName, request.keyword())
                        .or().like(Employee::getEmployeeNo, request.keyword()));
            }
            if (StringUtils.hasText(request.gradeLevel())) {
                wrapper.eq(Employee::getGradeLevel, request.gradeLevel());
            }
            if (StringUtils.hasText(request.orgName())) {
                wrapper.like(Employee::getOrgName, request.orgName());
            }
            if (StringUtils.hasText(request.positionSequenceName())) {
                wrapper.like(Employee::getPositionSequenceName, request.positionSequenceName());
            }
            wrapper.orderByAsc(Employee::getEmployeeNo);

            Page<Employee> page = employeeMapper.selectPage(new Page<>(1, 20), wrapper);
            List<Map<String, Object>> results = new ArrayList<>();
            for (Employee emp : page.getRecords()) {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("id", emp.getId());
                item.put("employeeNo", emp.getEmployeeNo());
                item.put("name", emp.getName());
                item.put("orgName", emp.getOrgName());
                item.put("gradeLevel", emp.getGradeLevel());
                item.put("positionSequenceName", emp.getPositionSequenceName());
                item.put("jobTitle", emp.getJobTitle());
                item.put("education", emp.getEducation());
                item.put("university", emp.getUniversity());
                results.add(item);
            }

            Map<String, Object> response = new LinkedHashMap<>();
            response.put("total", page.getTotal());
            response.put("employees", results);
            return objectMapper.writeValueAsString(response);
        } catch (Exception e) {
            log.error("搜索员工失败", e);
            return "{\"error\": \"搜索员工失败: " + e.getMessage() + "\"}";
        }
    }
}
