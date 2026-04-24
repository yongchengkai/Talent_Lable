-- V11: 修复 V10 正则误匹配导致的规则-标签全量关联
-- 说明：
-- 1) 清理重复关系（同一 rule_id + tag_id 保留一条）
-- 2) 删除不满足“DSL 中实际包含 TAG_CODE”条件的关系
-- 3) 回填缺失关系（按精确占位符匹配）

-- 1. 去重：同一规则同一标签只保留最小 id 的一条
DELETE FROM tag_rule_output a
USING tag_rule_output b
WHERE a.id > b.id
  AND a.rule_id = b.rule_id
  AND a.tag_id = b.tag_id;

-- 2. 清理错误关系：规则或标签已删除，或 DSL 中不存在该标签编码
DELETE FROM tag_rule_output tro
USING tag_rule r, tag_definition t
WHERE tro.rule_id = r.id
  AND tro.tag_id = t.id
  AND (
    COALESCE(r.deleted, 0) = 1
    OR COALESCE(t.deleted, 0) = 1
    OR NOT (
      COALESCE(r.dsl_content, '') LIKE ('%（' || t.tag_code || '）%')
      OR COALESCE(r.dsl_content, '') LIKE ('%(' || t.tag_code || ')%')
    )
  );

-- 3. 回填缺失关系：按 #{标签名（TAG_CODE）} / #{label(TAG_CODE)} 的 TAG_CODE 匹配
INSERT INTO tag_rule_output (rule_id, branch_id, tag_id, created_at)
SELECT DISTINCT r.id, NULL::bigint, t.id, NOW()
FROM tag_rule r
JOIN tag_definition t
  ON (
    COALESCE(r.dsl_content, '') LIKE ('%（' || t.tag_code || '）%')
    OR COALESCE(r.dsl_content, '') LIKE ('%(' || t.tag_code || ')%')
  )
LEFT JOIN tag_rule_output tro
  ON tro.rule_id = r.id
 AND tro.tag_id = t.id
WHERE tro.id IS NULL
  AND COALESCE(r.deleted, 0) = 0
  AND COALESCE(t.deleted, 0) = 0;
