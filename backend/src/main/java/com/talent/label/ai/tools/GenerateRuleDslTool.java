package com.talent.label.ai.tools;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.talent.label.domain.entity.TagDefinition;
import com.talent.label.mapper.TagDefinitionMapper;
import com.talent.label.service.AiService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Component("generateRuleDsl")
@RequiredArgsConstructor
public class GenerateRuleDslTool implements Function<GenerateRuleDslTool.Request, String> {

    private final AiService aiService;
    private final ObjectMapper objectMapper;
    private final TagDefinitionMapper tagDefinitionMapper;

    private static final String AVAILABLE_FIELDS = """
            @{职级（grade_level）}, @{组织名称（org_name）}, @{组织ID（org_id）}, @{职位序列（position_sequence_code）}, @{职族（job_family_code）}, @{职务（job_title）}, @{学历（education）}, @{毕业院校（university）}, @{用工类型（employment_type）}, @{员工状态（employee_status）}, @{入职日期（hire_date）}, @{出生日期（birth_date）}, @{司龄（tenure_years）}, @{年龄（age）}
            """;

    public record Request(
            @JsonProperty("naturalLanguage") @JsonPropertyDescription("自然语言规则描述，如'当职级大于等于P7时，输出导师候选'") String naturalLanguage
    ) {}

    @Override
    public String apply(Request request) {
        try {
            List<TagDefinition> tags = tagDefinitionMapper.selectList(
                    new LambdaQueryWrapper<TagDefinition>().eq(TagDefinition::getStatus, "ACTIVE"));
            String availableTags = tags.stream()
                    .map(t -> "#{" + t.getTagName() + "（" + t.getTagCode() + "）}")
                    .collect(Collectors.joining(", "));

            String dsl = aiService.generateDsl(request.naturalLanguage(), AVAILABLE_FIELDS, availableTags);
            return "{\"dsl\": " + objectMapper.writeValueAsString(dsl) + "}";
        } catch (Exception e) {
            log.error("生成DSL失败", e);
            return "{\"error\": \"生成DSL失败: " + e.getMessage() + "\"}";
        }
    }
}
