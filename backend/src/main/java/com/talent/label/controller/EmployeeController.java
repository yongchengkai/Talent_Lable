package com.talent.label.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.talent.label.common.R;
import com.talent.label.domain.entity.Employee;
import com.talent.label.mapper.EmployeeMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/employees")
@RequiredArgsConstructor
public class EmployeeController {

    private final EmployeeMapper employeeMapper;

    /** 组织树（从 org_path 构建，最多 3 层） */
    @GetMapping("/org-tree")
    public R<List<Map<String, Object>>> orgTree() {
        // 查询所有在职员工的组织信息（去重）
        List<Employee> employees = employeeMapper.selectList(
                new LambdaQueryWrapper<Employee>()
                        .eq(Employee::getEmployeeStatus, "ACTIVE")
                        .select(Employee::getOrgId, Employee::getOrgName, Employee::getOrgPath));

        // 按 orgId 聚合，统计每个组织的人数
        Map<Long, String> orgNameMap = new LinkedHashMap<>();
        Map<Long, String> orgPathMap = new LinkedHashMap<>();
        Map<Long, Integer> orgCountMap = new LinkedHashMap<>();
        for (Employee e : employees) {
            orgNameMap.putIfAbsent(e.getOrgId(), e.getOrgName());
            orgPathMap.putIfAbsent(e.getOrgId(), e.getOrgPath());
            orgCountMap.merge(e.getOrgId(), 1, Integer::sum);
        }

        // 从 org_path 构建树（最多 3 层）
        Map<String, Map<String, Object>> nodeMap = new LinkedHashMap<>();

        for (Map.Entry<Long, String> entry : orgNameMap.entrySet()) {
            Long orgId = entry.getKey();
            String orgName = entry.getValue();
            String orgPath = orgPathMap.get(orgId);
            int count = orgCountMap.getOrDefault(orgId, 0);

            if (orgPath == null || orgPath.isEmpty()) {
                orgPath = "/" + orgName;
            }

            // 解析路径层级
            String[] parts = orgPath.split("/");
            List<String> levels = new ArrayList<>();
            for (String p : parts) {
                if (!p.isEmpty()) levels.add(p);
            }
            // 限制 3 层
            if (levels.size() > 3) levels = levels.subList(0, 3);

            // 构建每一层节点
            StringBuilder pathBuilder = new StringBuilder();
            for (int i = 0; i < levels.size(); i++) {
                String prev = pathBuilder.toString();
                pathBuilder.append("/").append(levels.get(i));
                String key = pathBuilder.toString();

                if (!nodeMap.containsKey(key)) {
                    Map<String, Object> node = new LinkedHashMap<>();
                    node.put("key", key);
                    node.put("title", levels.get(i));
                    node.put("parentKey", prev.isEmpty() ? null : prev);
                    node.put("employeeCount", 0);
                    node.put("children", new ArrayList<>());
                    // 叶子节点才关联 orgId
                    if (i == levels.size() - 1) {
                        node.put("orgId", orgId);
                        node.put("employeeCount", count);
                    }
                    nodeMap.put(key, node);
                }

                // 如果是叶子节点，累加人数
                if (i == levels.size() - 1) {
                    Map<String, Object> node = nodeMap.get(key);
                    node.put("orgId", orgId);
                    node.put("employeeCount", (int) node.get("employeeCount") + count);
                }
            }
        }

        // 组装树
        List<Map<String, Object>> roots = new ArrayList<>();
        for (Map<String, Object> node : nodeMap.values()) {
            String parentKey = (String) node.get("parentKey");
            if (parentKey == null) {
                roots.add(node);
            } else {
                Map<String, Object> parent = nodeMap.get(parentKey);
                if (parent != null) {
                    @SuppressWarnings("unchecked")
                    List<Map<String, Object>> children = (List<Map<String, Object>>) parent.get("children");
                    children.add(node);
                } else {
                    roots.add(node);
                }
            }
        }

        // 递归累加父节点人数
        for (Map<String, Object> root : roots) {
            sumEmployeeCount(root);
        }

        return R.ok(roots);
    }

    @SuppressWarnings("unchecked")
    private int sumEmployeeCount(Map<String, Object> node) {
        List<Map<String, Object>> children = (List<Map<String, Object>>) node.get("children");
        int count = (int) node.get("employeeCount");
        if (children != null) {
            for (Map<String, Object> child : children) {
                count += sumEmployeeCount(child);
            }
        }
        node.put("employeeCount", count);
        return count;
    }

    /** 按组织查员工列表（支持搜索） */
    @GetMapping
    public R<Page<Employee>> page(
            @RequestParam(defaultValue = "1") int current,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) Long orgId,
            @RequestParam(required = false) String keyword) {
        LambdaQueryWrapper<Employee> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Employee::getEmployeeStatus, "ACTIVE");
        if (orgId != null) {
            wrapper.eq(Employee::getOrgId, orgId);
        }
        if (StringUtils.hasText(keyword)) {
            wrapper.and(w -> w.like(Employee::getName, keyword)
                    .or().like(Employee::getEmployeeNo, keyword));
        }
        wrapper.orderByAsc(Employee::getName);
        return R.ok(employeeMapper.selectPage(new Page<>(current, size), wrapper));
    }
}
