package com.talent.label.service;

import java.util.Map;

public interface AiService {
    /** 自然语言 → DSL JSON */
    String generateDsl(String naturalLanguage, String availableFields, String availableTags);

    /** AI 语义打标：输入员工文本数据，返回候选标签和置信度 */
    Map<String, Object> semanticTag(String inputText, java.util.List<String> candidateTags, String promptTemplate);

    /** 规划智能体：根据业务场景生成标签方案 */
    Map<String, Object> planTagScheme(String scenario, String painPoints, String existingData);
}
