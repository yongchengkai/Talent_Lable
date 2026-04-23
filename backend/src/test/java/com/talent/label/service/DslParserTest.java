package com.talent.label.service;

import com.talent.label.domain.entity.Employee;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class DslParserTest {

    private DslParser dslParser;

    @BeforeEach
    void setUp() {
        dslParser = new DslParser();
    }

    @Test
    void single_branch_should_keep_backward_compatibility() {
        String dsl = """
                {
                  "conditions": [
                    { "field": "@{职级（grade_level）}", "op": "EQ", "value": "P6" }
                  ],
                  "logic": "AND",
                  "outputs": ["#{P6人才（TAG_P6）}"]
                }
                """;
        DslParser.DslData parsed = dslParser.parse(dsl);
        Employee employee = new Employee();
        employee.setGradeLevel("P6");

        Map<String, Boolean> hitMap = dslParser.evaluateTagHits(parsed, employee);

        assertEquals(List.of("TAG_P6"), dslParser.extractTagCodes(parsed));
        assertTrue(Boolean.TRUE.equals(hitMap.get("TAG_P6")));
        assertTrue(dslParser.evaluate(parsed, employee));
    }

    @Test
    void multi_branch_should_hit_only_matching_branch_outputs() {
        String dsl = """
                {
                  "type": "MULTI_BRANCH",
                  "branches": [
                    {
                      "conditions": [{ "field": "@{职级（grade_level）}", "op": "EQ", "value": "P5" }],
                      "logic": "AND",
                      "outputs": ["#{P5人才（TAG_P5）}"]
                    },
                    {
                      "conditions": [{ "field": "@{职级（grade_level）}", "op": "EQ", "value": "P6" }],
                      "logic": "AND",
                      "outputs": ["#{P6人才（TAG_P6）}"]
                    }
                  ]
                }
                """;
        DslParser.DslData parsed = dslParser.parse(dsl);
        Employee employee = new Employee();
        employee.setGradeLevel("P6");

        Map<String, Boolean> hitMap = dslParser.evaluateTagHits(parsed, employee);

        assertEquals(List.of("TAG_P5", "TAG_P6"), dslParser.extractTagCodes(parsed));
        assertFalse(Boolean.TRUE.equals(hitMap.get("TAG_P5")));
        assertTrue(Boolean.TRUE.equals(hitMap.get("TAG_P6")));
        assertTrue(dslParser.evaluate(parsed, employee));
    }
}
