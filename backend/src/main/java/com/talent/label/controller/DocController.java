package com.talent.label.controller;

import com.talent.label.common.R;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Slf4j
@RestController
@RequestMapping("/docs")
public class DocController {

    @Value("${app.docs-dir:}")
    private String configuredDocsDir;

    private Path getDocsDir() {
        if (configuredDocsDir != null && !configuredDocsDir.isBlank()) {
            return Paths.get(configuredDocsDir);
        }
        // 默认：项目根目录/doc
        Path current = Paths.get(System.getProperty("user.dir"));
        if (current.endsWith("backend") || Files.exists(current.resolve("pom.xml"))) {
            current = current.getParent();
        }
        Path docDir = current.resolve("doc");
        log.info("文档目录: {}", docDir.toAbsolutePath());
        return docDir;
    }

    @GetMapping
    public R<List<Map<String, String>>> list() {
        Path dir = getDocsDir();
        if (!Files.exists(dir)) {
            log.warn("文档目录不存在: {}，尝试创建", dir.toAbsolutePath());
            try {
                Files.createDirectories(dir);
            } catch (IOException e) {
                log.error("创建文档目录失败: {}", dir, e);
            }
            return R.ok(new ArrayList<>());
        }
        List<Map<String, String>> docs = new ArrayList<>();
        try (Stream<Path> files = Files.list(dir)) {
            docs = files
                    .filter(p -> p.toString().endsWith(".md"))
                    .sorted()
                    .map(p -> {
                        Map<String, String> item = new LinkedHashMap<>();
                        item.put("filename", p.getFileName().toString());
                        item.put("name", p.getFileName().toString().replace(".md", ""));
                        return item;
                    })
                    .collect(Collectors.toList());
        } catch (IOException e) {
            log.error("读取文档目录失败: {}", dir, e);
        }
        return R.ok(docs);
    }

    @GetMapping("/{filename:.+}")
    public R<Map<String, String>> read(@PathVariable String filename) {
        if (!filename.endsWith(".md")) {
            filename += ".md";
        }
        Path file = getDocsDir().resolve(filename);
        if (!Files.exists(file)) {
            return R.ok(Map.of("filename", filename, "content", "> 文档不存在: " + filename));
        }
        try {
            String content = Files.readString(file, StandardCharsets.UTF_8);
            // 去掉 BOM
            if (content.startsWith("\uFEFF")) {
                content = content.substring(1);
            }
            Map<String, String> result = new LinkedHashMap<>();
            result.put("filename", filename);
            result.put("content", content);
            return R.ok(result);
        } catch (IOException e) {
            log.error("读取文档失败: {}", file, e);
            return R.ok(Map.of("filename", filename, "content", "> 读取失败: " + e.getMessage()));
        }
    }

    @PutMapping("/{filename:.+}")
    public R<Void> save(@PathVariable String filename, @RequestBody Map<String, String> body) {
        if (!filename.endsWith(".md")) {
            filename += ".md";
        }
        String content = body.get("content");
        if (content == null) {
            return R.fail("内容不能为空");
        }
        Path file = getDocsDir().resolve(filename);
        try {
            Files.createDirectories(file.getParent());
            Files.writeString(file, content, StandardCharsets.UTF_8);
            return R.ok(null);
        } catch (IOException e) {
            log.error("保存文档失败: {}", file, e);
            return R.fail("保存失败: " + e.getMessage());
        }
    }
}
