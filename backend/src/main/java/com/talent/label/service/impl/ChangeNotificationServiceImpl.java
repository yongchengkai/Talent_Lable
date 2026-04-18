package com.talent.label.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.talent.label.common.BizException;
import com.talent.label.domain.entity.*;
import com.talent.label.mapper.*;
import com.talent.label.service.ChangeNotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChangeNotificationServiceImpl implements ChangeNotificationService {

    private final ChangeNotificationMapper notificationMapper;
    private final EmployeeChangeLogMapper changeLogMapper;
    private final EmployeeMapper employeeMapper;
    private final EmployeeTagResultMapper tagResultMapper;
    private final TagRuleConditionMapper conditionMapper;
    private final TagRuleMapper ruleMapper;
    private final TagRuleScopeMapper scopeMapper;
    private final AiRuleConfigMapper aiRuleConfigMapper;
    private final ObjectMapper objectMapper;

    private static final int BATCH_SIZE = 500;

    /** 作用域字段 → scope_type 映射 */
    private static final Map<String, String> SCOPE_FIELD_MAP = Map.of(
            "org_id", "ORG",
            "position_sequence_code", "POSITION_SEQUENCE",
            "job_family_code", "JOB_FAMILY"
    );

    /** 离职相关状态值 */
    private static final Set<String> INACTIVE_STATUSES = Set.of(
            "INACTIVE", "RESIGNED", "TERMINATED", "DISMISSED"
    );

    /** 字段编码 → 中文名 */
    private static final Map<String, String> FIELD_LABEL_MAP = Map.ofEntries(
            Map.entry("name", "姓名"),
            Map.entry("org_id", "组织"),
            Map.entry("org_name", "组织名称"),
            Map.entry("org_path", "组织路径"),
            Map.entry("position_sequence_code", "职位序列"),
            Map.entry("position_sequence_name", "职位序列名称"),
            Map.entry("job_family_code", "职族"),
            Map.entry("job_family_name", "职族名称"),
            Map.entry("job_title", "职务"),
            Map.entry("grade_level", "职级"),
            Map.entry("birth_date", "出生日期"),
            Map.entry("hire_date", "入职日期"),
            Map.entry("education", "学历"),
            Map.entry("university", "毕业院校"),
            Map.entry("resume_text", "简历"),
            Map.entry("project_experience", "项目经历"),
            Map.entry("employment_type", "用工类型"),
            Map.entry("employee_status", "员工状态")
    );

    // ==================== REST API 方法 ====================

    @Override
    public Page<ChangeNotification> page(int current, int size, String status, String severity) {
        LambdaQueryWrapper<ChangeNotification> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(status)) {
            wrapper.eq(ChangeNotification::getStatus, status);
        }
        if (StringUtils.hasText(severity)) {
            wrapper.eq(ChangeNotification::getSeverity, severity);
        }
        wrapper.orderByDesc(ChangeNotification::getCreatedAt);
        return notificationMapper.selectPage(new Page<>(current, size), wrapper);
    }

    @Override
    public ChangeNotification getById(Long id) {
        ChangeNotification n = notificationMapper.selectById(id);
        if (n == null) throw new BizException("通知不存在");
        return n;
    }

    @Override
    public void markRead(Long id) {
        ChangeNotification n = getById(id);
        if ("UNREAD".equals(n.getStatus())) {
            n.setStatus("READ");
            n.setReadAt(LocalDateTime.now());
            notificationMapper.updateById(n);
        }
    }

    @Override
    public void markAllRead() {
        notificationMapper.update(null, new LambdaUpdateWrapper<ChangeNotification>()
                .eq(ChangeNotification::getStatus, "UNREAD")
                .set(ChangeNotification::getStatus, "READ")
                .set(ChangeNotification::getReadAt, LocalDateTime.now()));
    }

    @Override
    public void dismiss(Long id) {
        ChangeNotification n = getById(id);
        n.setStatus("DISMISSED");
        notificationMapper.updateById(n);
    }

    @Override
    public long countUnread() {
        return notificationMapper.selectCount(
                new LambdaQueryWrapper<ChangeNotification>()
                        .eq(ChangeNotification::getStatus, "UNREAD"));
    }

    // ==================== 核心：变更日志处理 ====================

    @Override
    @Transactional
    public void processChangeLogs() {
        // 1. 捞取未处理的变更日志
        List<EmployeeChangeLog> logs = changeLogMapper.selectList(
                new LambdaQueryWrapper<EmployeeChangeLog>()
                        .eq(EmployeeChangeLog::getProcessed, false)
                        .orderByAsc(EmployeeChangeLog::getCreatedAt)
                        .last("LIMIT " + BATCH_SIZE));

        if (logs.isEmpty()) return;

        // 2. 按 employee_id 分组
        Map<Long, List<EmployeeChangeLog>> grouped = logs.stream()
                .collect(Collectors.groupingBy(EmployeeChangeLog::getEmployeeId));

        // 3. 预加载所有 PUBLISHED 规则的条件和作用域
        List<TagRule> publishedRules = ruleMapper.selectList(
                new LambdaQueryWrapper<TagRule>().eq(TagRule::getStatus, "PUBLISHED"));
        Set<Long> publishedRuleIds = publishedRules.stream()
                .map(TagRule::getId).collect(Collectors.toSet());
        Map<Long, TagRule> ruleMap = publishedRules.stream()
                .collect(Collectors.toMap(TagRule::getId, r -> r));

        // 4. 处理每个员工的变更
        for (Map.Entry<Long, List<EmployeeChangeLog>> entry : grouped.entrySet()) {
            Long employeeId = entry.getKey();
            List<EmployeeChangeLog> empLogs = entry.getValue();
            try {
                processEmployeeChanges(employeeId, empLogs, publishedRuleIds, ruleMap);
            } catch (Exception e) {
                log.error("处理员工 {} 的变更日志失败", employeeId, e);
            }
        }

        // 5. 标记已处理
        List<Long> processedIds = logs.stream().map(EmployeeChangeLog::getId).toList();
        changeLogMapper.update(null, new LambdaUpdateWrapper<EmployeeChangeLog>()
                .in(EmployeeChangeLog::getId, processedIds)
                .set(EmployeeChangeLog::getProcessed, true));
    }

    private void processEmployeeChanges(Long employeeId, List<EmployeeChangeLog> logs,
                                         Set<Long> publishedRuleIds, Map<Long, TagRule> ruleMap) {
        // 取员工信息
        Employee employee = employeeMapper.selectById(employeeId);
        String employeeNo = logs.get(0).getEmployeeNo();
        String employeeName = employee != null ? employee.getName() : employeeNo;
        String changeType = logs.get(0).getChangeType();

        // 收集变更字段
        Set<String> changedFieldCodes = logs.stream()
                .map(EmployeeChangeLog::getFieldCode).collect(Collectors.toSet());

        // 构建 changedFields JSON 数据
        List<Map<String, String>> changedFieldsList = logs.stream().map(l -> {
            Map<String, String> m = new LinkedHashMap<>();
            m.put("field", l.getFieldCode());
            m.put("fieldName", FIELD_LABEL_MAP.getOrDefault(l.getFieldCode(), l.getFieldCode()));
            m.put("old", l.getOldValue());
            m.put("new", l.getNewValue());
            return m;
        }).toList();

        // 检查是否为离职变更
        boolean isResignation = logs.stream().anyMatch(l ->
                "employee_status".equals(l.getFieldCode())
                        && l.getNewValue() != null
                        && INACTIVE_STATUSES.contains(l.getNewValue().toUpperCase()));

        if (isResignation) {
            handleResignation(employeeId, employeeNo, employeeName, changedFieldsList);
            return;
        }

        // 查找受影响的规则
        List<Map<String, Object>> affectedRules = findAffectedRules(
                changedFieldCodes, publishedRuleIds, ruleMap);

        // 如果没有受影响的规则且是 UPDATE，跳过（INSERT 始终生成通知）
        if (affectedRules.isEmpty() && "UPDATE".equals(changeType)) return;

        // 确定 severity
        String severity = determineSeverity(changedFieldCodes);

        // 构建摘要
        String summary = buildSummary(employeeName, employeeNo, changeType,
                changedFieldCodes, affectedRules.size());

        // 创建通知
        createNotification(employeeId, employeeNo, employeeName,
                "INSERT".equals(changeType) ? "INSERT" : "UPDATE",
                summary, changedFieldsList, affectedRules, severity);
    }

    /** 离职处理：失效所有标签 + 生成 CRITICAL 通知 */
    private void handleResignation(Long employeeId, String employeeNo,
                                    String employeeName, List<Map<String, String>> changedFields) {
        // 直接失效该员工所有有效标签
        tagResultMapper.update(null, new LambdaUpdateWrapper<EmployeeTagResult>()
                .eq(EmployeeTagResult::getEmployeeId, employeeId)
                .eq(EmployeeTagResult::getValidFlag, true)
                .set(EmployeeTagResult::getValidFlag, false));

        String summary = String.format("%s(%s)已离职，所有标签已自动失效", employeeName, employeeNo);

        createNotification(employeeId, employeeNo, employeeName,
                "STATUS_CHANGE", summary, changedFields, List.of(), "CRITICAL");

        log.info("员工 {} 离职，已失效所有标签", employeeNo);
    }

    /** 查找受变更字段影响的已发布规则 */
    private List<Map<String, Object>> findAffectedRules(Set<String> changedFields,
                                                         Set<Long> publishedRuleIds,
                                                         Map<Long, TagRule> ruleMap) {
        Map<Long, String> affectedMap = new LinkedHashMap<>(); // ruleId → reason

        // 1. 结构化规则：通过 condition.field_code 匹配
        if (!publishedRuleIds.isEmpty()) {
            List<TagRuleCondition> conditions = conditionMapper.selectList(
                    new LambdaQueryWrapper<TagRuleCondition>()
                            .in(TagRuleCondition::getFieldCode, changedFields)
                            .in(TagRuleCondition::getRuleId, publishedRuleIds));

            for (TagRuleCondition c : conditions) {
                affectedMap.merge(c.getRuleId(),
                        "条件字段「" + FIELD_LABEL_MAP.getOrDefault(c.getFieldCode(), c.getFieldCode()) + "」变更",
                        (a, b) -> a);
            }
        }

        // 2. AI 规则：通过 input_fields 匹配
        List<AiRuleConfig> aiConfigs = aiRuleConfigMapper.selectList(
                new LambdaQueryWrapper<AiRuleConfig>()
                        .in(AiRuleConfig::getRuleId, publishedRuleIds));

        for (AiRuleConfig config : aiConfigs) {
            try {
                List<String> inputFields = objectMapper.readValue(
                        config.getInputFields(), new TypeReference<>() {});
                Set<String> intersection = new HashSet<>(inputFields);
                intersection.retainAll(changedFields);
                if (!intersection.isEmpty()) {
                    String fieldNames = intersection.stream()
                            .map(f -> FIELD_LABEL_MAP.getOrDefault(f, f))
                            .collect(Collectors.joining("、"));
                    affectedMap.merge(config.getRuleId(),
                            "AI输入字段「" + fieldNames + "」变更",
                            (a, b) -> a);
                }
            } catch (Exception e) {
                log.warn("解析 AI 规则 {} 的 input_fields 失败", config.getRuleId(), e);
            }
        }

        // 3. 作用域变更：org_id / position_sequence_code / job_family_code
        for (Map.Entry<String, String> scopeEntry : SCOPE_FIELD_MAP.entrySet()) {
            if (changedFields.contains(scopeEntry.getKey())) {
                List<TagRuleScope> scopes = scopeMapper.selectList(
                        new LambdaQueryWrapper<TagRuleScope>()
                                .eq(TagRuleScope::getScopeType, scopeEntry.getValue())
                                .in(TagRuleScope::getRuleId, publishedRuleIds));
                for (TagRuleScope scope : scopes) {
                    affectedMap.merge(scope.getRuleId(),
                            "作用域「" + FIELD_LABEL_MAP.getOrDefault(scopeEntry.getKey(), scopeEntry.getKey()) + "」变更",
                            (a, b) -> a);
                }
            }
        }

        // 转换为结果列表
        List<Map<String, Object>> result = new ArrayList<>();
        for (Map.Entry<Long, String> e : affectedMap.entrySet()) {
            TagRule rule = ruleMap.get(e.getKey());
            if (rule == null) continue;
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("ruleId", rule.getId());
            m.put("ruleName", rule.getRuleName());
            m.put("ruleType", rule.getRuleType());
            m.put("reason", e.getValue());
            result.add(m);
        }
        return result;
    }

    private String determineSeverity(Set<String> changedFields) {
        if (changedFields.contains("employee_status")) return "CRITICAL";
        for (String scopeField : SCOPE_FIELD_MAP.keySet()) {
            if (changedFields.contains(scopeField)) return "WARN";
        }
        return "INFO";
    }

    private String buildSummary(String name, String no, String changeType,
                                 Set<String> changedFields, int ruleCount) {
        if ("INSERT".equals(changeType)) {
            return String.format("新员工 %s(%s) 入职，需要进行初始标签计算", name, no);
        }
        String fieldNames = changedFields.stream()
                .map(f -> FIELD_LABEL_MAP.getOrDefault(f, f))
                .collect(Collectors.joining("、"));
        if (ruleCount > 0) {
            return String.format("%s(%s)的%s发生变更，影响 %d 条规则",
                    name, no, fieldNames, ruleCount);
        }
        return String.format("%s(%s)的%s发生变更", name, no, fieldNames);
    }

    private void createNotification(Long employeeId, String employeeNo, String employeeName,
                                     String changeType, String summary,
                                     List<Map<String, String>> changedFields,
                                     List<Map<String, Object>> affectedRules,
                                     String severity) {
        try {
            ChangeNotification n = new ChangeNotification();
            n.setEmployeeId(employeeId);
            n.setEmployeeNo(employeeNo);
            n.setEmployeeName(employeeName);
            n.setChangeType(changeType);
            n.setChangeSummary(summary);
            n.setChangedFields(objectMapper.writeValueAsString(changedFields));
            n.setAffectedRules(objectMapper.writeValueAsString(affectedRules));
            n.setSeverity(severity);
            n.setStatus("CRITICAL".equals(severity) && "STATUS_CHANGE".equals(changeType)
                    ? "PROCESSED" : "UNREAD");
            notificationMapper.insert(n);
        } catch (Exception e) {
            log.error("创建变更通知失败: employee={}", employeeNo, e);
        }
    }
}
