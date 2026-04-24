-- =============================================
-- 注册所有 embedded 页面
-- =============================================

DELETE FROM ai_widget_type;

INSERT INTO ai_widget_type (widget_code, widget_name, category, description, param_desc, sort_order)
VALUES
('tag-categories', '标签类目列表', 'DISPLAY',
 '嵌入标签类目管理页面，支持搜索、筛选和分页。支持 action 参数触发操作',
 'filters 支持 status(ACTIVE/INACTIVE)、keyword；action 支持 create（自动打开新建弹窗）', 1),

('tag-definitions', '标签定义列表', 'DISPLAY',
 '嵌入标签定义管理页面，支持搜索、按类目筛选、按状态筛选和分页。支持 action 参数触发操作',
 'filters 支持 status(ACTIVE/INACTIVE)、keyword、categoryId；action 支持 create（自动打开新建弹窗）', 2),

('rules-structured', '条件打标规则列表', 'DISPLAY',
 '嵌入条件打标规则管理页面，支持搜索、按发布状态筛选和分页。支持 action 参数触发操作',
 'filters 支持 status(UNPUBLISHED/PUBLISHED)、keyword；action 支持 create（自动打开新建弹窗）', 3),

('rules-semantic', '智能打标规则列表', 'DISPLAY',
 '嵌入智能打标规则管理页面，支持搜索、按发布状态筛选和分页。支持 action 参数触发操作',
 'filters 支持 status(UNPUBLISHED/PUBLISHED)、keyword；action 支持 create（自动打开新建弹窗）', 4),

('tasks-simulation', '模拟打标任务列表', 'DISPLAY',
 '嵌入模拟打标任务管理页面，支持搜索、按运行状态筛选和分页。支持 action 参数触发操作',
 'filters 支持 taskStatus(INIT/RUNNING/SUCCESS/FAILED)、keyword；action 支持 create（自动打开新建弹窗）', 5),

('tasks-formal', '正式打标任务列表', 'DISPLAY',
 '嵌入正式打标任务管理页面，支持搜索、按运行状态筛选和分页。支持 action 参数触发操作',
 'filters 支持 taskStatus(INIT/RUNNING/SUCCESS/FAILED)、keyword；action 支持 create（自动打开新建弹窗）', 6)

ON CONFLICT (widget_code) DO UPDATE SET
  widget_name = EXCLUDED.widget_name,
  description = EXCLUDED.description,
  param_desc = EXCLUDED.param_desc,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();
