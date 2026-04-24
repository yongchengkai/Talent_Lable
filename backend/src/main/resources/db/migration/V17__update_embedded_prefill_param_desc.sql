-- =============================================
-- 更新 embedded 页面参数说明：支持 create + prefill
-- =============================================

UPDATE ai_widget_type
SET param_desc = COALESCE(param_desc, '') || '；action=create 时可传 prefill 进行表单预填'
WHERE widget_code IN (
  'tag-categories',
  'tag-definitions',
  'rules-structured',
  'rules-semantic',
  'tasks-simulation',
  'tasks-formal'
);
