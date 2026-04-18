package com.talent.label.scheduler;

import com.talent.label.service.ChangeNotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class ChangeLogScheduler {

    private final ChangeNotificationService changeNotificationService;

    @Scheduled(fixedDelay = 60_000)
    public void scanChangeLogs() {
        log.debug("扫描员工变更日志...");
        try {
            changeNotificationService.processChangeLogs();
        } catch (Exception e) {
            log.error("变更日志处理异常", e);
        }
    }
}
