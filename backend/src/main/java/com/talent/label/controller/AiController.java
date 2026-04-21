package com.talent.label.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.talent.label.common.R;
import com.talent.label.domain.entity.TagDefinition;
import com.talent.label.mapper.TagDefinitionMapper;
import com.talent.label.service.AiService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiService aiService;
    private final TagDefinitionMapper tagDefinitionMapper;

    private static final String AVAILABLE_FIELDS = """
            @{职级（grade_level）} - 员工职级，如 P5, P6, P7, P8
            @{组织名称（org_name）} - 所属组织名称
            @{组织ID（org_id）} - 所属组织ID
            @{职位序列（position_sequence_code）} - 职位序列编码
            @{职族（job_family_code）} - 职族编码
            @{职务（job_title）} - 职务名称
            @{学历（education）} - 最高学历
            @{毕业院校（university）} - 毕业院校名称
            @{用工类型（employment_type）} - 用工类型
            @{员工状态（employee_status）} - 员工状态
            @{入职日期（hire_date）} - 入职日期，格式 yyyy-MM-dd
            @{出生日期（birth_date）} - 出生日期，格式 yyyy-MM-dd
            @{司龄（tenure_years）} - 司龄，单位年，数值类型
            @{年龄（age）} - 年龄，数值类型
            """;

    @PostMapping("/generate-dsl")
    public R<String> generateDsl(@RequestBody Map<String, String> body) {
        // 动态获取系统中所有启用的标签
        List<TagDefinition> tags = tagDefinitionMapper.selectList(
                new LambdaQueryWrapper<TagDefinition>().eq(TagDefinition::getStatus, "ACTIVE"));
        String availableTags = tags.stream()
                .map(t -> "#{" + t.getTagName() + "（" + t.getTagCode() + "）}")
                .collect(Collectors.joining("\n"));

        String result = aiService.generateDsl(
                body.get("naturalLanguage"),
                AVAILABLE_FIELDS,
                availableTags
        );
        return R.ok(result);
    }

    @PostMapping("/semantic-tag")
    @SuppressWarnings("unchecked")
    public R<Map<String, Object>> semanticTag(@RequestBody Map<String, Object> body) {
        Map<String, Object> result = aiService.semanticTag(
                (String) body.get("inputText"),
                (List<String>) body.get("candidateTags"),
                (String) body.get("promptTemplate")
        );
        return R.ok(result);
    }

    @PostMapping("/plan-scheme")
    public R<Map<String, Object>> planScheme(@RequestBody Map<String, String> body) {
        Map<String, Object> result = aiService.planTagScheme(
                body.get("scenario"),
                body.get("painPoints"),
                body.getOrDefault("existingData", "")
        );
        return R.ok(result);
    }
}
