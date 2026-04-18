package com.talent.label.controller;

import com.talent.label.common.R;
import com.talent.label.service.AiService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiService aiService;

    @PostMapping("/generate-dsl")
    public R<String> generateDsl(@RequestBody Map<String, String> body) {
        String result = aiService.generateDsl(
                body.get("naturalLanguage"),
                body.getOrDefault("context", "")
        );
        return R.ok(result);
    }

    @PostMapping("/semantic-tag")
    @SuppressWarnings("unchecked")
    public R<Map<String, Object>> semanticTag(@RequestBody Map<String, Object> body) {
        Map<String, Object> result = aiService.semanticTag(
                (String) body.get("inputText"),
                (List<String>) body.get("candidateTags"),
                (String) body.get("promptTemplate")
        );
        return R.ok(result);
    }

    @PostMapping("/plan-scheme")
    public R<Map<String, Object>> planScheme(@RequestBody Map<String, String> body) {
        Map<String, Object> result = aiService.planTagScheme(
                body.get("scenario"),
                body.get("painPoints"),
                body.getOrDefault("existingData", "")
        );
        return R.ok(result);
    }
}
