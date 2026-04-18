package com.talent.label.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.talent.label.domain.entity.ChangeNotification;

public interface ChangeNotificationService {
    Page<ChangeNotification> page(int current, int size, String status, String severity);
    ChangeNotification getById(Long id);
    void markRead(Long id);
    void markAllRead();
    void dismiss(Long id);
    long countUnread();
    void processChangeLogs();
}
