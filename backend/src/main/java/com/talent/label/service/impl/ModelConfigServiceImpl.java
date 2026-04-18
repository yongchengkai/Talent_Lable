package com.talent.label.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.talent.label.common.BizException;
import com.talent.label.domain.entity.AiModelConfig;
import com.talent.label.mapper.AiModelConfigMapper;
import com.talent.label.service.ModelConfigService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.ai.openai.api.OpenAiApi;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class ModelConfigServiceImpl implements ModelConfigService {

    private final AiModelConfigMapper modelConfigMapper;

    @Override
    public Page<AiModelConfig> page(int current, int size, String keyword, String provider, String status) {
        LambdaQueryWrapper<AiModelConfig> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(keyword)) {
            wrapper.and(w -> w.like(AiModelConfig::getModelName, keyword)
                    .or().like(AiModelConfig::getModelCode, keyword));
        }
        if (StringUtils.hasText(provider)) {
            wrapper.eq(AiModelConfig::getProvider, provider);
        }
        if (StringUtils.hasText(status)) {
            wrapper.eq(AiModelConfig::getStatus, status);
        }
        wrapper.orderByDesc(AiModelConfig::getIsDefault).orderByAsc(AiModelConfig::getCreatedAt);
        return modelConfigMapper.selectPage(new Page<>(current, size), wrapper);
    }

    @Override
    public AiModelConfig getById(Long id) {
        AiModelConfig config = modelConfigMapper.selectById(id);
        if (config == null) throw new BizException("模型配置不存在");
        return config;
    }

    @Override
    public AiModelConfig create(AiModelConfig config) {
        Long count = modelConfigMapper.selectCount(
                new LambdaQueryWrapper<AiModelConfig>().eq(AiModelConfig::getModelCode, config.getModelCode()));
        if (count > 0) throw new BizException("模型编码已存在");
        config.setCreatedBy("admin");
        config.setUpdatedBy("admin");
        modelConfigMapper.insert(config);
        return config;
    }

    @Override
    public AiModelConfig update(Long id, AiModelConfig config) {
        AiModelConfig existing = getById(id);
        config.setId(id);
        config.setModelCode(existing.getModelCode());
        config.setUpdatedBy("admin");
        modelConfigMapper.updateById(config);
        return modelConfigMapper.selectById(id);
    }

    @Override
    public void delete(Long id) {
        AiModelConfig config = getById(id);
        if (Boolean.TRUE.equals(config.getIsDefault())) {
            throw new BizException("默认模型不能删除");
        }
        modelConfigMapper.deleteById(id);
    }

    @Override
    @Transactional
    public void setDefault(Long id) {
        getById(id);
        // 先取消所有默认
        List<AiModelConfig> all = modelConfigMapper.selectList(
                new LambdaQueryWrapper<AiModelConfig>().eq(AiModelConfig::getIsDefault, true));
        for (AiModelConfig c : all) {
            c.setIsDefault(false);
            c.setUpdatedBy("admin");
            modelConfigMapper.updateById(c);
        }
        // 设置新默认
        AiModelConfig config = modelConfigMapper.selectById(id);
        config.setIsDefault(true);
        config.setUpdatedBy("admin");
        modelConfigMapper.updateById(config);
    }

    @Override
    public AiModelConfig getDefault() {
        AiModelConfig config = modelConfigMapper.selectOne(
                new LambdaQueryWrapper<AiModelConfig>()
                        .eq(AiModelConfig::getIsDefault, true)
                        .eq(AiModelConfig::getStatus, "ACTIVE")
                        .last("LIMIT 1"));
        if (config == null) {
            // fallback: 取第一个 ACTIVE 的
            config = modelConfigMapper.selectOne(
                    new LambdaQueryWrapper<AiModelConfig>()
                            .eq(AiModelConfig::getStatus, "ACTIVE")
                            .last("LIMIT 1"));
        }
        return config;
    }

    @Override
    public List<AiModelConfig> listActive() {
        return modelConfigMapper.selectList(
                new LambdaQueryWrapper<AiModelConfig>()
                        .eq(AiModelConfig::getStatus, "ACTIVE")
                        .orderByDesc(AiModelConfig::getIsDefault));
    }

    @Override
    public Map<String, Object> testConnection(Long id) {
        AiModelConfig config = getById(id);
        Map<String, Object> result = new HashMap<>();
        try {
            String apiKey = config.getApiKey();
            if (!StringUtils.hasText(apiKey)) {
                // 尝试从环境变量获取
                apiKey = System.getenv("SPRING_AI_OPENAI_API_KEY");
            }
            if (!StringUtils.hasText(apiKey) || "sk-placeholder".equals(apiKey)) {
                result.put("success", false);
                result.put("message", "未配置有效的 API Key");
                return result;
            }

            OpenAiApi api = new OpenAiApi(
                    config.getBaseUrl() != null ? config.getBaseUrl() : "https://api.openai.com",
                    apiKey);
            OpenAiChatModel testModel = new OpenAiChatModel(api,
                    OpenAiChatOptions.builder()
                            .withModel(config.getModelCode())
                            .withMaxTokens(10)
                            .build());
            String response = testModel.call("hi");
            result.put("success", true);
            result.put("message", "连接成功: " + response);
        } catch (Exception e) {
            log.warn("模型连通性测试失败: {}", e.getMessage());
            result.put("success", false);
            result.put("message", "连接失败: " + e.getMessage());
        }
        return result;
    }
}
