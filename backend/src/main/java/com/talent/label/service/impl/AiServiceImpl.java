package com.talent.label.service.impl;

import com.talent.label.ai.DynamicChatModelFactory;
import com.talent.label.service.AiService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiServiceImpl implements AiService {

    private final DynamicChatModelFactory chatModelFactory;

    private ChatClient client() {
        return ChatClient.builder(chatModelFactory.getDefaultModel()).build();
    }

    @Override
    public String generateDsl(String naturalLanguage, String availableFields, String availableTags) {
        String systemPrompt = """
                你是一个人才打标系统的规则 DSL 生成助手。
                用户会用自然语言描述打标规则，你需要将其转换为 JSON 格式的 DSL。

                输出格式（严格 JSON，不要 markdown 包裹）：
                {
                  "conditions": [
                    { "field": "@{字段中文名（field_code）}", "op": "操作符", "value": "值" }
                  ],
                  "logic": "AND 或 OR",
                  "outputs": ["#{标签名称（TAG_CODE）}"]
                }

                多分支规则格式：
                {
                  "type": "MULTI_BRANCH",
                  "branches": [
                    {
                      "conditions": [{ "field": "...", "op": "...", "value": "..." }],
                      "logic": "AND",
                      "outputs": ["#{标签名（TAG_CODE）}"]
                    }
                  ]
                }

                支持的操作符：EQ(等于), NE(不等于), GT(大于), GE(大于等于), LT(小于), LE(小于等于), IN(在列表中,逗号分隔), NOT_IN(不在列表中), BETWEEN(区间,逗号分隔), LIKE(包含)

                规则：
                - field 必须使用 @{中文名（field_code）} 格式，从可用字段列表中匹配
                - outputs 必须使用 #{标签名（TAG_CODE）} 格式，从可用标签列表中匹配
                - 单条件时 logic 设为 "AND"
                - 只输出 JSON，不要任何其他文字

                可用字段列表：
                """ + availableFields + """

                可用标签列表：
                """ + availableTags;

        String userPrompt = "请根据以下描述生成 DSL 规则：\n" + naturalLanguage;

        return client().prompt()
                .system(systemPrompt)
                .user(userPrompt)
                .call()
                .content();
    }

    @Override
    public Map<String, Object> semanticTag(String inputText, List<String> candidateTags, String promptTemplate) {
        String systemPrompt = """
                你是一个人才标签语义识别引擎。
                根据输入的员工文本信息，从候选标签中选择匹配的标签。
                返回 JSON 格式：{"tags": [{"tag": "标签名", "confidence": 0.95, "explanation": "匹配原因"}]}
                置信度范围 0.0 到 1.0。只返回置信度 > 0.5 的标签。
                """;

        String userPrompt = String.format(
                "候选标签：%s\n\n员工信息：\n%s",
                String.join(", ", candidateTags),
                inputText
        );

        if (promptTemplate != null && !promptTemplate.isBlank()) {
            systemPrompt = promptTemplate;
        }

        String result = client().prompt()
                .system(systemPrompt)
                .user(userPrompt)
                .call()
                .content();

        Map<String, Object> response = new HashMap<>();
        response.put("raw", result);
        response.put("inputText", inputText);
        return response;
    }

    @Override
    public Map<String, Object> planTagScheme(String scenario, String painPoints, String existingData) {
        String systemPrompt = """
                你是一个人才标签体系规划专家。
                根据用户描述的业务场景、痛点和现有数据，生成完整的标签方案。

                输出 JSON 格式：
                {
                  "categories": [{"code": "CAT_XXX", "name": "类目名", "description": "说明"}],
                  "tags": [{"code": "TAG_XXX", "name": "标签名", "categoryCode": "CAT_XXX", "source": "STATIC_RULE/STATIC_AI/DYNAMIC", "description": "说明"}],
                  "rules": [{"name": "规则名", "type": "STRUCTURED/AI_SEMANTIC", "description": "规则逻辑说明", "targetTags": ["TAG_XXX"]}]
                }
                """;

        String userPrompt = String.format(
                "业务场景：%s\n痛点：%s\n现有数据：%s",
                scenario, painPoints, existingData
        );

        String result = client().prompt()
                .system(systemPrompt)
                .user(userPrompt)
                .call()
                .content();

        Map<String, Object> response = new HashMap<>();
        response.put("raw", result);
        response.put("scenario", scenario);
        return response;
    }
}
