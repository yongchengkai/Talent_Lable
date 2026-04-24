-- =============================================
-- 补充注册 embedded 页面：标签总览 / 打标审批 / 标签迁移
-- =============================================

INSERT INTO ai_widget_type (widget_code, widget_name, category, description, param_desc, sort_order)
VALUES
('tag-results', '标签总览列表', 'DISPLAY',
 '嵌入标签总览页面，支持按姓名/工号和职级筛选，展示员工标签命中结果。',
 'filters 支持 keyword、gradeLevel', 7),

('approvals', '打标审批列表', 'DISPLAY',
 '嵌入打标审批页面，支持按任务关键字和审批状态筛选，查看待审批/已审批任务。',
 'filters 支持 keyword、submitStatus(SUBMITTED/APPROVED/REJECTED)', 8),

('tag-migration', '标签迁移页面', 'DISPLAY',
 '嵌入标签迁移页面，支持在两个类目之间迁移标签。',
 'filters 支持 sourceCatId、targetCatId', 9)

ON CONFLICT (widget_code) DO UPDATE SET
  widget_name = EXCLUDED.widget_name,
  description = EXCLUDED.description,
  param_desc = EXCLUDED.param_desc,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();
