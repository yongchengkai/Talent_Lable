package com.talent.label.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.talent.label.domain.entity.AiModelConfig;
import java.util.List;
import java.util.Map;

public interface ModelConfigService {
    Page<AiModelConfig> page(int current, int size, String keyword, String provider, String status);
    AiModelConfig getById(Long id);
    AiModelConfig create(AiModelConfig config);
    AiModelConfig update(Long id, AiModelConfig config);
    void delete(Long id);
    void setDefault(Long id);
    AiModelConfig getDefault();
    List<AiModelConfig> listActive();
    Map<String, Object> testConnection(Long id);
}
