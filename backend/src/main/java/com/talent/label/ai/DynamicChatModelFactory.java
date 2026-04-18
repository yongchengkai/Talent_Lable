package com.talent.label.ai;

import com.talent.label.domain.entity.AiModelConfig;
import com.talent.label.service.ModelConfigService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.ai.openai.api.OpenAiApi;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
@RequiredArgsConstructor
public class DynamicChatModelFactory {

    private final ModelConfigService modelConfigService;
    private final Map<String, ChatModel> modelCache = new ConcurrentHashMap<>();

    public ChatModel getModel(Long modelId) {
        AiModelConfig config;
        if (modelId != null) {
            config = modelConfigService.getById(modelId);
        } else {
            config = modelConfigService.getDefault();
        }
        if (config == null) {
            throw new RuntimeException("未找到可用的模型配置，请先在模型配置页面添加模型");
        }
        return getOrCreateModel(config);
    }

    public ChatModel getDefaultModel() {
        return getModel(null);
    }

    public void evictCache(String modelCode) {
        modelCache.remove(modelCode);
        log.info("已清除模型缓存: {}", modelCode);
    }

    public void evictAll() {
        modelCache.clear();
        log.info("已清除所有模型缓存");
    }

    private ChatModel getOrCreateModel(AiModelConfig config) {
        return modelCache.computeIfAbsent(config.getModelCode(), code -> {
            log.info("创建模型实例: {} ({})", config.getModelName(), config.getProvider());
            return createModel(config);
        });
    }

    private ChatModel createModel(AiModelConfig config) {
        String provider = config.getProvider().toUpperCase();
        switch (provider) {
            case "OPENAI", "AZURE", "DEEPSEEK" -> {
                return createOpenAiCompatibleModel(config);
            }
            default -> {
                log.warn("未知的模型提供商: {}，尝试使用 OpenAI 兼容模式", provider);
                return createOpenAiCompatibleModel(config);
            }
        }
    }

    private ChatModel createOpenAiCompatibleModel(AiModelConfig config) {
        String apiKey = config.getApiKey();
        if (!StringUtils.hasText(apiKey)) {
            apiKey = System.getenv("SPRING_AI_OPENAI_API_KEY");
        }
        if (!StringUtils.hasText(apiKey)) {
            apiKey = "sk-placeholder";
        }

        String baseUrl = config.getBaseUrl();
        if (!StringUtils.hasText(baseUrl)) {
            baseUrl = "https://api.openai.com";
        }

        OpenAiApi api = new OpenAiApi(baseUrl, apiKey);
        OpenAiChatOptions options = OpenAiChatOptions.builder()
                .withModel(config.getModelCode())
                .withTemperature(config.getTemperature() != null ? config.getTemperature().doubleValue() : 0.3)
                .withMaxTokens(config.getMaxTokens() != null ? config.getMaxTokens() : 4000)
                .build();

        return new OpenAiChatModel(api, options);
    }
}
