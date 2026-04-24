-- =============================================
-- 更新 embedded 页面参数说明：支持 edit + prefill(id 必填)
-- =============================================

UPDATE ai_widget_type
SET param_desc = COALESCE(param_desc, '') || '；action=edit 时可传 prefill（需包含 id）进行编辑表单预填'
WHERE widget_code IN (
  'tag-categories',
  'tag-definitions',
  'rules-structured',
  'rules-semantic',
  'tasks-simulation',
  'tasks-formal'
);
