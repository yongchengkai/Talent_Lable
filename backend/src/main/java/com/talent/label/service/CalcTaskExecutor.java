package com.talent.label.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.talent.label.domain.entity.*;
import com.talent.label.mapper.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Component
public class CalcTaskExecutor {

    private final CalcTaskMapper taskMapper;
    private final CalcTaskRuleMapper taskRuleMapper;
    private final TagRuleMapper ruleMapper;
    private final EmployeeMapper employeeMapper;
    private final TagDefinitionMapper tagDefinitionMapper;
    private final EmployeeTagResultMapper resultMapper;
    private final EmployeeTagResultDetailMapper detailMapper;
    private final AiRuleConfigMapper aiRuleConfigMapper;
    private final DslParser dslParser;
    private final AiService aiService;
    private final ObjectMapper objectMapper;

    public CalcTaskExecutor(CalcTaskMapper taskMapper, CalcTaskRuleMapper taskRuleMapper,
                            TagRuleMapper ruleMapper, EmployeeMapper employeeMapper,
                            TagDefinitionMapper tagDefinitionMapper, EmployeeTagResultMapper resultMapper,
                            EmployeeTagResultDetailMapper detailMapper, AiRuleConfigMapper aiRuleConfigMapper,
                            DslParser dslParser, @Lazy AiService aiService, ObjectMapper objectMapper) {
        this.taskMapper = taskMapper;
        this.taskRuleMapper = taskRuleMapper;
        this.ruleMapper = ruleMapper;
        this.employeeMapper = employeeMapper;
        this.tagDefinitionMapper = tagDefinitionMapper;
        this.resultMapper = resultMapper;
        this.detailMapper = detailMapper;
        this.aiRuleConfigMapper = aiRuleConfigMapper;
        this.dslParser = dslParser;
        this.aiService = aiService;
        this.objectMapper = objectMapper;
    }

    @Async
    public void execute(Long taskId) {
        CalcTask task = taskMapper.selectById(taskId);
        if (task == null) return;

        int totalCount = 0;
        int successCount = 0;
        int failCount = 0;

        try {
            // 1. 获取任务关联的规则
            List<CalcTaskRule> taskRules = taskRuleMapper.selectList(
                    new LambdaQueryWrapper<CalcTaskRule>().eq(CalcTaskRule::getTaskId, taskId));
            List<Long> ruleIds = taskRules.stream().map(CalcTaskRule::getRuleId).toList();

            if (ruleIds.isEmpty()) {
                finishTask(task, 0, 0, 0, "没有关联规则");
                return;
            }

            // 2. 获取目标员工
            List<Employee> employees = getTargetEmployees(task);
            if (employees.isEmpty()) {
                finishTask(task, 0, 0, 0, "没有匹配的员工");
                return;
            }

            // 3. 获取规则列表
            List<TagRule> rules = ruleMapper.selectBatchIds(ruleIds);

            // 4. 预加载标签编码 → ID 映射 和 标签名 → ID 映射
            List<TagDefinition> allTags = tagDefinitionMapper.selectList(new LambdaQueryWrapper<TagDefinition>());
            Map<String, Long> tagCodeToId = new HashMap<>();
            Map<String, Long> tagNameToId = new HashMap<>();
            for (TagDefinition t : allTags) {
                tagCodeToId.put(t.getTagCode(), t.getId());
                tagNameToId.put(t.getTagName(), t.getId());
            }

            // 4.5 清理本次任务中这些规则的旧结果（支持重新运行覆盖）
            for (Long ruleId : ruleIds) {
                detailMapper.delete(new LambdaQueryWrapper<EmployeeTagResultDetail>()
                        .eq(EmployeeTagResultDetail::getTaskId, taskId)
                        .eq(EmployeeTagResultDetail::getRuleId, ruleId));
                resultMapper.delete(new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<EmployeeTagResult>()
                        .eq(EmployeeTagResult::getTaskId, taskId)
                        .eq(EmployeeTagResult::getSourceRuleId, ruleId));
            }

            // 5. 逐规则逐员工执行
            List<String> failMessages = new ArrayList<>();
            for (TagRule rule : rules) {
                totalCount++;
                try {
                    if ("STRUCTURED".equals(rule.getRuleType())) {
                        executeStructuredRule(rule, employees, tagCodeToId, taskId, task.getTaskMode());
                    } else if ("AI_SEMANTIC".equals(rule.getRuleType())) {
                        executeAiSemanticRule(rule, employees, tagCodeToId, tagNameToId, taskId, task.getTaskMode());
                    } else {
                        log.warn("未知规则类型: {} ({})", rule.getRuleName(), rule.getRuleType());
                        failCount++;
                        failMessages.add(rule.getRuleName() + ": 未知规则类型 " + rule.getRuleType());
                        continue;
                    }
                    successCount++;
                } catch (Exception e) {
                    log.error("规则 {} 执行失败: {}", rule.getRuleCode(), e.getMessage());
                    failCount++;
                    failMessages.add(rule.getRuleName() + ": " + e.getMessage());
                }
            }

            String errorMsg = failMessages.isEmpty() ? null : String.join("\n", failMessages);
            finishTask(task, totalCount, successCount, failCount, errorMsg);

        } catch (Exception e) {
            log.error("任务 {} 执行异常", taskId, e);
            task.setTaskStatus("FAILED");
            task.setEndTime(LocalDateTime.now());
            task.setErrorMessage(e.getMessage());
            taskMapper.updateById(task);
        }
    }

    // ==================== 结构化规则执行 ====================

    private void executeStructuredRule(TagRule rule, List<Employee> employees,
                                         Map<String, Long> tagCodeToId, Long taskId, String taskMode) {
        DslParser.DslData dsl = dslParser.parse(rule.getDslContent());

        List<String> tagCodes = dslParser.extractTagCodes(dsl);
        List<Long> outputTagIds = new ArrayList<>();
        for (String code : tagCodes) {
            Long tagId = tagCodeToId.get(code);
            if (tagId != null) outputTagIds.add(tagId);
            else log.warn("规则 {} 引用的标签编码 {} 不存在", rule.getRuleCode(), code);
        }

        if (outputTagIds.isEmpty()) {
            log.warn("规则 {} 没有有效的输出标签", rule.getRuleCode());
            return;
        }

        for (Employee emp : employees) {
            boolean hit = dslParser.evaluate(dsl, emp);
            for (Long tagId : outputTagIds) {
                EmployeeTagResultDetail detail = new EmployeeTagResultDetail();
                detail.setTaskId(taskId);
                detail.setEmployeeId(emp.getId());
                detail.setRuleId(rule.getId());
                detail.setTagId(tagId);
                detail.setEvidenceType("STRUCTURED");
                detail.setScopeMatched(true);
                detail.setConditionMatched(hit);
                detail.setConditionSnapshot(rule.getDslContent());
                detail.setFinalDecision(hit ? "HIT" : "REJECTED");
                detailMapper.insert(detail);

                if (hit) {
                    writeTagResult(emp.getId(), tagId, rule.getId(), taskId, taskMode);
                }
            }
        }
    }

    // ==================== AI 语义规则执行 ====================

    private void executeAiSemanticRule(TagRule rule, List<Employee> employees,
                                         Map<String, Long> tagCodeToId, Map<String, Long> tagNameToId,
                                         Long taskId, String taskMode) {

        // 1. 加载 AI 规则配置
        AiRuleConfig config = aiRuleConfigMapper.selectOne(
                new LambdaQueryWrapper<AiRuleConfig>().eq(AiRuleConfig::getRuleId, rule.getId()));

        // 2. 从 dslContent 中提取候选标签
        List<String> candidateTagNames = extractCandidateTagNames(rule.getDslContent());
        List<Long> candidateTagIds = new ArrayList<>();
        for (String name : candidateTagNames) {
            Long id = tagNameToId.get(name);
            if (id != null) candidateTagIds.add(id);
        }

        if (candidateTagNames.isEmpty()) {
            log.warn("AI 规则 {} 没有候选标签", rule.getRuleCode());
            return;
        }

        // 3. 从 dslContent 中解析输入字段 @{字段名（field_code）}
        List<String> inputFields = extractInputFields(rule.getDslContent());
        // 如果 dslContent 没有 @ 引用，尝试从 ai_rule_config 读取
        if (inputFields.isEmpty()) {
            if (config != null && config.getInputFields() != null) {
                try {
                    inputFields = objectMapper.readValue(config.getInputFields(), new TypeReference<>() {});
                } catch (Exception e) {
                    inputFields = List.of("resume_text", "project_experience", "university");
                }
            } else {
                inputFields = List.of("resume_text", "project_experience", "university");
            }
        }

        String promptTemplate = config != null ? config.getPromptTemplate() : null;
        // 如果没有独立 prompt，构建标准 prompt
        if (promptTemplate == null || promptTemplate.isBlank()) {
            // 将 dslContent 中的 @{字段名（field_code）} 和 #{标签名（TAG_CODE）} 转为可读文本
            String readableRule = rule.getDslContent()
                    .replaceAll("@\\{(.+?)（[a-z_]+）\\}", "$1")
                    .replaceAll("#\\{(.+?)（[A-Z0-9_]+）\\}", "$1");
            promptTemplate = "你是一个人才标签语义识别引擎。\n" +
                    "规则描述：" + readableRule + "\n\n" +
                    "候选标签：" + String.join("、", candidateTagNames) + "\n\n" +
                    "请根据员工信息判断该员工匹配哪些候选标签。\n" +
                    "返回严格的 JSON 格式（不要 markdown 包裹）：\n" +
                    "{\"tags\": [{\"tag\": \"标签名\", \"confidence\": 0.95, \"explanation\": \"匹配原因\"}]}\n" +
                    "规则：\n" +
                    "- 置信度范围 0.0 到 1.0\n" +
                    "- 只返回置信度 > 0.5 的标签\n" +
                    "- 如果没有匹配的标签，返回 {\"tags\": []}\n" +
                    "- 只返回 JSON，不要任何其他文字";
        }

        // 4. 逐员工调用 LLM
        for (Employee emp : employees) {
            try {
                // 拼接员工输入文本
                String inputText = buildEmployeeInputText(emp, inputFields);

                // 调用 AI 服务
                Map<String, Object> aiResult = aiService.semanticTag(inputText, candidateTagNames, promptTemplate);
                String rawResult = (String) aiResult.get("raw");

                // 解析 AI 返回的标签
                List<AiTagResult> aiTags = parseAiTagResult(rawResult);

                // 写入证据和结果
                for (String candidateName : candidateTagNames) {
                    Long tagId = tagNameToId.get(candidateName);
                    if (tagId == null) continue;

                    AiTagResult matched = aiTags.stream()
                            .filter(t -> t.tag.equals(candidateName))
                            .findFirst().orElse(null);

                    boolean hit = matched != null && matched.confidence > 0.5;

                    EmployeeTagResultDetail detail = new EmployeeTagResultDetail();
                    detail.setTaskId(taskId);
                    detail.setEmployeeId(emp.getId());
                    detail.setRuleId(rule.getId());
                    detail.setTagId(tagId);
                    detail.setEvidenceType("AI_SEMANTIC");
                    detail.setScopeMatched(true);
                    detail.setConditionMatched(hit);
                    detail.setAiInputText(inputText.length() > 2000 ? inputText.substring(0, 2000) : inputText);
                    detail.setAiCandidates("[\"" + String.join("\",\"", candidateTagNames) + "\"]");
                    detail.setAiExplanation(matched != null ? matched.explanation : null);
                    detail.setAiConfidence(matched != null ? BigDecimal.valueOf(matched.confidence) : null);
                    detail.setFinalDecision(hit ? "HIT" : "REJECTED");
                    detailMapper.insert(detail);

                    if (hit) {
                        writeTagResult(emp.getId(), tagId, rule.getId(), taskId, taskMode);
                    }
                }
            } catch (Exception e) {
                log.error("AI 规则 {} 对员工 {} 执行失败: {}", rule.getRuleCode(), emp.getEmployeeNo(), e.getMessage());
                throw new RuntimeException("AI 规则对员工 " + emp.getEmployeeNo() + " 执行失败: " + e.getMessage(), e);
            }
        }
    }

    /** 从 dslContent 中提取 #{标签名（标签编码）} 的标签名列表 */
    private List<String> extractCandidateTagNames(String dslContent) {
        List<String> names = new ArrayList<>();
        if (dslContent == null) return names;
        Pattern pattern = Pattern.compile("#\\{(.+?)（[A-Z0-9_]+）\\}");
        Matcher matcher = pattern.matcher(dslContent);
        while (matcher.find()) {
            String name = matcher.group(1);
            if (!names.contains(name)) names.add(name);
        }
        return names;
    }

    /** 从 dslContent 中提取 @{字段名（field_code）} 的 field_code 列表 */
    private List<String> extractInputFields(String dslContent) {
        List<String> fields = new ArrayList<>();
        if (dslContent == null) return fields;
        Pattern pattern = Pattern.compile("@\\{.+?（([a-z_]+)）\\}");
        Matcher matcher = pattern.matcher(dslContent);
        while (matcher.find()) {
            String code = matcher.group(1);
            if (!fields.contains(code)) fields.add(code);
        }
        return fields;
    }

    /** 拼接员工输入文本 */
    private String buildEmployeeInputText(Employee emp, List<String> inputFields) {
        StringBuilder sb = new StringBuilder();
        for (String field : inputFields) {
            String value = getEmployeeFieldValue(emp, field);
            if (value != null && !value.isBlank()) {
                String label = switch (field) {
                    case "university" -> "毕业院校";
                    case "resume_text" -> "简历";
                    case "project_experience" -> "项目经历";
                    case "job_title" -> "职务";
                    case "education" -> "学历";
                    case "grade_level" -> "职级";
                    case "org_name" -> "组织";
                    default -> field;
                };
                sb.append(label).append("：").append(value).append("\n");
            }
        }
        return sb.toString();
    }

    private String getEmployeeFieldValue(Employee emp, String field) {
        return switch (field) {
            case "university" -> emp.getUniversity();
            case "resume_text" -> emp.getResumeText();
            case "project_experience" -> emp.getProjectExperience();
            case "job_title" -> emp.getJobTitle();
            case "education" -> emp.getEducation();
            case "grade_level" -> emp.getGradeLevel();
            case "org_name" -> emp.getOrgName();
            case "name" -> emp.getName();
            case "employee_no" -> emp.getEmployeeNo();
            default -> null;
        };
    }

    /** 解析 AI 返回的 JSON 结果 */
    @SuppressWarnings("unchecked")
    private List<AiTagResult> parseAiTagResult(String raw) {
        if (raw == null || raw.isBlank()) return List.of();
        try {
            // 提取 JSON 部分（AI 可能返回 markdown 包裹的 JSON）
            String json = raw.trim();
            if (json.contains("```")) {
                int start = json.indexOf("{");
                int end = json.lastIndexOf("}");
                if (start >= 0 && end > start) json = json.substring(start, end + 1);
            }
            // 确保从 { 开始
            if (!json.startsWith("{")) {
                int start = json.indexOf("{");
                if (start >= 0) json = json.substring(start);
            }

            Object rawParsed = objectMapper.readValue(json, Object.class);
            List<AiTagResult> results = new ArrayList<>();

            if (rawParsed instanceof Map<?, ?> map) {
                Object tagsObj = map.get("tags");
                if (tagsObj instanceof List<?> tagsList) {
                    for (Object item : tagsList) {
                        AiTagResult r = new AiTagResult();
                        if (item instanceof Map<?, ?> tagMap) {
                            r.tag = String.valueOf(tagMap.get("tag"));
                            Object conf = tagMap.get("confidence");
                            r.confidence = conf instanceof Number n ? n.doubleValue() : 0.0;
                            Object expl = tagMap.get("explanation");
                            r.explanation = expl != null ? String.valueOf(expl) : null;
                        } else if (item instanceof String s) {
                            // LLM 可能直接返回标签名字符串
                            r.tag = s;
                            r.confidence = 0.9;
                            r.explanation = "AI 直接匹配";
                        }
                        if (r.tag != null && !r.tag.isBlank()) results.add(r);
                    }
                }
            }

            log.debug("AI 返回解析结果: {} 个标签命中", results.size());
            return results;
        } catch (Exception e) {
            log.warn("解析 AI 返回结果失败: {}，原始内容: {}", e.getMessage(), raw.length() > 200 ? raw.substring(0, 200) : raw);
            return List.of();
        }
    }

    private static class AiTagResult {
        String tag;
        double confidence;
        String explanation;
    }

    // ==================== 公共方法 ====================

    /** 写入标签结果 */
    private void writeTagResult(Long employeeId, Long tagId, Long ruleId, Long taskId, String taskMode) {
        EmployeeTagResult result = new EmployeeTagResult();
        result.setEmployeeId(employeeId);
        result.setTagId(tagId);
        result.setSourceRuleId(ruleId);
        result.setTaskId(taskId);
        result.setHitTime(LocalDateTime.now());
        // 标签结果始终先写为 false，正式打标审批通过后才置为 true
        result.setValidFlag(false);
        resultMapper.insert(result);
    }

    /** 获取目标员工 */
    private List<Employee> getTargetEmployees(CalcTask task) {
        LambdaQueryWrapper<Employee> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Employee::getEmployeeStatus, "ACTIVE");

        String scope = task.getTaskScope();
        if (scope != null && !scope.isEmpty() && !"null".equals(scope)) {
            try {
                Map<String, Object> scopeMap = objectMapper.readValue(scope, new TypeReference<>() {});
                List<Number> orgIds = (List<Number>) scopeMap.get("orgIds");
                List<Number> employeeIds = (List<Number>) scopeMap.get("employeeIds");

                boolean hasOrgs = orgIds != null && !orgIds.isEmpty();
                boolean hasEmployees = employeeIds != null && !employeeIds.isEmpty();

                if (hasOrgs || hasEmployees) {
                    wrapper.and(w -> {
                        if (hasOrgs) {
                            List<Long> oids = orgIds.stream().map(Number::longValue).toList();
                            w.in(Employee::getOrgId, oids);
                        }
                        if (hasOrgs && hasEmployees) w.or();
                        if (hasEmployees) {
                            List<Long> eids = employeeIds.stream().map(Number::longValue).toList();
                            w.in(Employee::getId, eids);
                        }
                    });
                }
            } catch (Exception e) {
                log.warn("解析 taskScope 失败，使用全员: {}", e.getMessage());
            }
        }

        return employeeMapper.selectList(wrapper);
    }

    private void finishTask(CalcTask task, int total, int success, int fail, String errorMsg) {
        task.setTaskStatus(fail > 0 && success == 0 ? "FAILED" : "SUCCESS");
        task.setTotalCount(total);
        task.setSuccessCount(success);
        task.setFailCount(fail);
        task.setEndTime(LocalDateTime.now());
        task.setErrorMessage(errorMsg);
        taskMapper.updateById(task);
        log.info("任务 {} 执行完成: total={}, success={}, fail={}", task.getTaskNo(), total, success, fail);
    }
}
