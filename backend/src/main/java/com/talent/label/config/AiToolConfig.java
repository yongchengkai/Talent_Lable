package com.talent.label.config;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.talent.label.domain.entity.AiSkill;
import com.talent.label.mapper.AiSkillMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.model.function.FunctionCallback;
import org.springframework.ai.model.function.FunctionCallbackWrapper;
import org.springframework.aop.support.AopUtils;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.lang.reflect.ParameterizedType;
import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.function.Function;

@Slf4j
@Configuration
@RequiredArgsConstructor
public class AiToolConfig {

    @Bean
    public List<FunctionCallback> talentLabelTools(ApplicationContext ctx, AiSkillMapper skillMapper) {
        try {
            List<AiSkill> skills = skillMapper.selectList(
                    new LambdaQueryWrapper<AiSkill>()
                            .eq(AiSkill::getEnabled, true)
                            .orderByAsc(AiSkill::getSortOrder));

            List<FunctionCallback> callbacks = new ArrayList<>();
            for (AiSkill skill : skills) {
                try {
                    if (!ctx.containsBean(skill.getToolName())) {
                        log.warn("Bean '{}' 不存在，跳过注册 (skill={})", skill.getToolName(), skill.getSkillCode());
                        continue;
                    }

                    Object bean = ctx.getBean(skill.getToolName());
                    if (!(bean instanceof Function)) {
                        log.warn("Bean '{}' 不是 Function 类型，跳过注册", skill.getToolName());
                        continue;
                    }

                    String description = skill.getDescription();
                    if (skill.getWhenToUse() != null && !skill.getWhenToUse().isBlank()) {
                        description += " 使用时机: " + skill.getWhenToUse();
                    }

                    @SuppressWarnings("unchecked")
                    Function<Object, Object> fn = (Function<Object, Object>) bean;

                    Class<?> inputType = resolveInputType(bean);

                    FunctionCallback callback = FunctionCallbackWrapper.builder(fn)
                            .withName(skill.getToolName())
                            .withDescription(description)
                            .withInputType(inputType)
                            .build();

                    callbacks.add(callback);
                    log.info("注册AI工具: {} -> {} (inputType={}, {})",
                            skill.getSkillCode(), skill.getToolName(), inputType.getSimpleName(),
                            skill.getRequiresConfirm() ? "需确认" : "直接执行");
                } catch (Exception e) {
                    log.warn("注册AI工具失败: {} -> {} - {}", skill.getSkillCode(), skill.getToolName(), e.getMessage());
                }
            }
            log.info("共注册 {} 个AI工具", callbacks.size());
            return callbacks;
        } catch (Exception e) {
            log.error("AI工具注册整体失败，返回空列表。原因: {}", e.getMessage(), e);
            return Collections.emptyList();
        }
    }

    private Class<?> resolveInputType(Object bean) {
        Class<?> targetClass = AopUtils.getTargetClass(bean);

        for (Class<?> inner : targetClass.getDeclaredClasses()) {
            if ("Request".equals(inner.getSimpleName())) {
                return inner;
            }
        }

        for (Type iface : targetClass.getGenericInterfaces()) {
            if (iface instanceof ParameterizedType pt
                    && pt.getRawType() == Function.class
                    && pt.getActualTypeArguments().length > 0) {
                Type arg = pt.getActualTypeArguments()[0];
                if (arg instanceof Class<?> cls) {
                    return cls;
                }
            }
        }

        log.warn("未能解析 {} 的输入类型，使用 Object", targetClass.getSimpleName());
        return Object.class;
    }
}
