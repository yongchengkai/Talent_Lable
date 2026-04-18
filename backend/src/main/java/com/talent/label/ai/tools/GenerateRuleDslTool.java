package com.talent.label.ai.tools;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.talent.label.service.AiService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.function.Function;

@Slf4j
@Component("generateRuleDsl")
@RequiredArgsConstructor
public class GenerateRuleDslTool implements Function<GenerateRuleDslTool.Request, String> {

    private final AiService aiService;
    private final ObjectMapper objectMapper;

    public record Request(
            @JsonProperty("naturalLanguage") @JsonPropertyDescription("自然语言规则描述，如'P8以上且司龄满3年'") String naturalLanguage,
            @JsonProperty("context") @JsonPropertyDescription("上下文信息，如现有规则的字段说明") String context
    ) {}

    @Override
    public String apply(Request request) {
        try {
            String dsl = aiService.generateDsl(request.naturalLanguage(), request.context());
            return "{\"dsl\": " + objectMapper.writeValueAsString(dsl) + "}";
        } catch (Exception e) {
            log.error("生成DSL失败", e);
            return "{\"error\": \"生成DSL失败: " + e.getMessage() + "\"}";
        }
    }
}
