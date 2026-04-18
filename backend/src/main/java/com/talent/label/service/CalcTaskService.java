package com.talent.label.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.talent.label.domain.entity.CalcTask;

import java.util.List;

public interface CalcTaskService {
    Page<CalcTask> page(int current, int size, String keyword, String taskMode, String taskStatus);
    CalcTask getById(Long id);
    CalcTask create(CalcTask task, List<Long> ruleIds);
    void run(Long id);
    void submit(Long id);
    void delete(Long id);
}
