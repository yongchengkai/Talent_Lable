package com.talent.label.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.talent.label.domain.entity.Employee;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Slf4j
@Component
public class DslParser {

    private static final ObjectMapper objectMapper = new ObjectMapper();

    @Data
    public static class DslData {
        private List<Condition> conditions = new ArrayList<>();
        private String logic = "AND";
        private List<String> outputs = new ArrayList<>();
    }

    @Data
    public static class Condition {
        private String field;
        private String op;
        private String value;
    }

    /** 解析 JSON DSL 字符串 */
    public DslData parse(String dslContent) {
        try {
            return objectMapper.readValue(dslContent, DslData.class);
        } catch (Exception e) {
            log.error("DSL 解析失败: {}", dslContent, e);
            throw new RuntimeException("DSL 格式不正确: " + e.getMessage());
        }
    }

    /** 对单个员工评估 DSL 条件，返回是否命中 */
    public boolean evaluate(DslData dsl, Employee employee) {
        if (dsl.getConditions() == null || dsl.getConditions().isEmpty()) return false;

        boolean isAnd = "AND".equalsIgnoreCase(dsl.getLogic());

        for (Condition cond : dsl.getConditions()) {
            boolean matched = evaluateCondition(cond, employee);
            if (isAnd && !matched) return false;
            if (!isAnd && matched) return true;
        }

        return isAnd; // AND: 全部通过返回 true; OR: 全部不通过返回 false
    }

    /** 从 outputs 中提取标签编码列表 */
    public List<String> extractTagCodes(DslData dsl) {
        List<String> codes = new ArrayList<>();
        if (dsl.getOutputs() == null) return codes;
        for (String output : dsl.getOutputs()) {
            // 格式: #{标签名称（TAG_CODE）}
            int start = output.indexOf('（');
            int end = output.indexOf('）');
            if (start >= 0 && end > start) {
                codes.add(output.substring(start + 1, end));
            }
        }
        return codes;
    }

    /** 解析字段引用格式：@{字段名（field_code）} → field_code，普通字符串原样返回 */
    private String resolveFieldCode(String field) {
        if (field != null && field.startsWith("@{") && field.endsWith("}")) {
            int start = field.indexOf('（');
            int end = field.indexOf('）');
            if (start >= 0 && end > start) {
                return field.substring(start + 1, end);
            }
        }
        return field;
    }

    private boolean evaluateCondition(Condition cond, Employee employee) {
        String field = resolveFieldCode(cond.getField());
        String fieldValue = getFieldValue(field, employee);
        if (fieldValue == null) return false;

        String op = cond.getOp().toUpperCase();
        String expected = cond.getValue();

        return switch (op) {
            case "EQ" -> fieldValue.equals(expected);
            case "NE" -> !fieldValue.equals(expected);
            case "GT" -> compareNumeric(fieldValue, expected) > 0;
            case "GE" -> compareNumeric(fieldValue, expected) >= 0;
            case "LT" -> compareNumeric(fieldValue, expected) < 0;
            case "LE" -> compareNumeric(fieldValue, expected) <= 0;
            case "IN" -> evaluateIn(fieldValue, expected);
            case "NOT_IN" -> !evaluateIn(fieldValue, expected);
            case "BETWEEN" -> evaluateBetween(fieldValue, expected);
            case "LIKE" -> fieldValue.toLowerCase().contains(expected.toLowerCase());
            default -> {
                log.warn("不支持的运算符: {}", op);
                yield false;
            }
        };
    }

    /** 获取员工字段值（含计算字段） */
    private String getFieldValue(String field, Employee employee) {
        return switch (field) {
            case "grade_level" -> employee.getGradeLevel();
            case "org_id" -> employee.getOrgId() != null ? String.valueOf(employee.getOrgId()) : null;
            case "org_name" -> employee.getOrgName();
            case "org_path" -> employee.getOrgPath();
            case "position_sequence_code" -> employee.getPositionSequenceCode();
            case "position_sequence_name" -> employee.getPositionSequenceName();
            case "job_family_code" -> employee.getJobFamilyCode();
            case "job_family_name" -> employee.getJobFamilyName();
            case "job_title" -> employee.getJobTitle();
            case "education" -> employee.getEducation();
            case "university" -> employee.getUniversity();
            case "employment_type" -> employee.getEmploymentType();
            case "employee_status" -> employee.getEmployeeStatus();
            case "hire_date" -> employee.getHireDate() != null ? employee.getHireDate().toString() : null;
            case "birth_date" -> employee.getBirthDate() != null ? employee.getBirthDate().toString() : null;
            case "tenure_years" -> calcTenureYears(employee);
            case "age" -> calcAge(employee);
            default -> {
                log.warn("未知字段: {}", field);
                yield null;
            }
        };
    }

    /** 计算司龄（年） */
    private String calcTenureYears(Employee employee) {
        if (employee.getHireDate() == null) return null;
        long years = ChronoUnit.YEARS.between(employee.getHireDate(), LocalDate.now());
        return String.valueOf(years);
    }

    /** 计算年龄 */
    private String calcAge(Employee employee) {
        if (employee.getBirthDate() == null) return null;
        long years = ChronoUnit.YEARS.between(employee.getBirthDate(), LocalDate.now());
        return String.valueOf(years);
    }

    /** 数值比较（支持字符串职级比较如 P5 < P7） */
    private int compareNumeric(String a, String b) {
        try {
            double da = Double.parseDouble(a);
            double db = Double.parseDouble(b);
            return Double.compare(da, db);
        } catch (NumberFormatException e) {
            // 尝试提取数字部分（如 P7 → 7）
            double na = extractNumber(a);
            double nb = extractNumber(b);
            if (!Double.isNaN(na) && !Double.isNaN(nb)) {
                return Double.compare(na, nb);
            }
            // 退化为字符串比较
            return a.compareTo(b);
        }
    }

    /** 从字符串中提取数字（如 P7 → 7, M3 → 3） */
    private double extractNumber(String s) {
        StringBuilder sb = new StringBuilder();
        for (char c : s.toCharArray()) {
            if (Character.isDigit(c) || c == '.') sb.append(c);
        }
        if (sb.isEmpty()) return Double.NaN;
        try {
            return Double.parseDouble(sb.toString());
        } catch (NumberFormatException e) {
            return Double.NaN;
        }
    }

    /** IN 运算：值在逗号分隔的列表中 */
    private boolean evaluateIn(String fieldValue, String expected) {
        String[] parts = expected.split(",");
        for (String part : parts) {
            if (fieldValue.trim().equalsIgnoreCase(part.trim())) return true;
        }
        return false;
    }

    /** BETWEEN 运算：值在两个逗号分隔的边界之间（含边界） */
    private boolean evaluateBetween(String fieldValue, String expected) {
        String[] parts = expected.split(",");
        if (parts.length != 2) return false;
        return compareNumeric(fieldValue, parts[0].trim()) >= 0
                && compareNumeric(fieldValue, parts[1].trim()) <= 0;
    }
}
