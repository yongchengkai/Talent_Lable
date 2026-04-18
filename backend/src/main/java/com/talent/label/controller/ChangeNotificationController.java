package com.talent.label.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.talent.label.common.R;
import com.talent.label.domain.entity.ChangeNotification;
import com.talent.label.service.ChangeNotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
public class ChangeNotificationController {

    private final ChangeNotificationService notificationService;

    @GetMapping
    public R<Page<ChangeNotification>> page(
            @RequestParam(defaultValue = "1") int current,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String severity) {
        return R.ok(notificationService.page(current, size, status, severity));
    }

    @GetMapping("/unread-count")
    public R<Long> unreadCount() {
        return R.ok(notificationService.countUnread());
    }

    @GetMapping("/{id}")
    public R<ChangeNotification> getById(@PathVariable Long id) {
        return R.ok(notificationService.getById(id));
    }

    @PutMapping("/{id}/read")
    public R<Void> markRead(@PathVariable Long id) {
        notificationService.markRead(id);
        return R.ok();
    }

    @PutMapping("/read-all")
    public R<Void> markAllRead() {
        notificationService.markAllRead();
        return R.ok();
    }

    @PutMapping("/{id}/dismiss")
    public R<Void> dismiss(@PathVariable Long id) {
        notificationService.dismiss(id);
        return R.ok();
    }
}
