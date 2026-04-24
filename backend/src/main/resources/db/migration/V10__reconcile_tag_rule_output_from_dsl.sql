-- V10: 对齐 tag_rule_output 与 tag_rule.dsl_content 的标签引用关系
-- 说明：
-- 1) 清理重复关系（同一 rule_id + tag_id 保留一条）
-- 2) 删除 dsl_content 中已不存在的旧关系
-- 3) 从 dsl_content 回填缺失关系

-- 1. 去重：同一规则同一标签只保留最小 id 的一条
DELETE FROM tag_rule_output a
USING tag_rule_output b
WHERE a.id > b.id
  AND a.rule_id = b.rule_id
  AND a.tag_id = b.tag_id;

-- 2. 清理陈旧关系：当 dsl_content 不再包含标签编码时删除
DELETE FROM tag_rule_output tro
USING tag_rule r, tag_definition t
WHERE tro.rule_id = r.id
  AND tro.tag_id = t.id
  AND COALESCE(r.deleted, 0) = 0
  AND COALESCE(t.deleted, 0) = 0
  AND NOT (COALESCE(r.dsl_content, '') ~ ('(（|\\()' || t.tag_code || '(）|\\))'));

-- 3. 回填缺失关系：从 dsl_content 提取标签编码并补齐
INSERT INTO tag_rule_output (rule_id, branch_id, tag_id, created_at)
SELECT DISTINCT r.id, NULL::bigint, t.id, NOW()
FROM tag_rule r
JOIN tag_definition t
  ON COALESCE(r.dsl_content, '') ~ ('(（|\\()' || t.tag_code || '(）|\\))')
LEFT JOIN tag_rule_output tro
  ON tro.rule_id = r.id
 AND tro.tag_id = t.id
WHERE tro.id IS NULL
  AND COALESCE(r.deleted, 0) = 0
  AND COALESCE(t.deleted, 0) = 0;
