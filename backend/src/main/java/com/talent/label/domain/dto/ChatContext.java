package com.talent.label.domain.dto;

import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
public class ChatContext {
    private String currentPage;
    private List<Long> selectedIds;
    private Map<String, String> filters;
    private Integer unreadNotifications;
    private Integer criticalNotifications;
}
