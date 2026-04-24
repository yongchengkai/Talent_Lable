-- =============================================
-- 清理 widget 类型，只保留 embedded 页面
-- =============================================

DELETE FROM ai_widget_type;

INSERT INTO ai_widget_type (widget_code, widget_name, category, description, param_desc, sort_order)
VALUES
('tag-categories', '标签类目列表', 'DISPLAY',
 '嵌入标签类目管理页面，支持搜索、筛选和分页，和系统页面完全一致',
 'filters 支持 status(ACTIVE/INACTIVE)、keyword', 1)
ON CONFLICT (widget_code) DO NOTHING;
