-- =============================================
-- Widget 类型动态注册
-- =============================================

CREATE TABLE IF NOT EXISTS ai_widget_type (
    id              BIGSERIAL PRIMARY KEY,
    widget_code     VARCHAR(64)  NOT NULL UNIQUE,
    widget_name     VARCHAR(128) NOT NULL,
    category        VARCHAR(32)  NOT NULL DEFAULT 'DISPLAY',  -- DISPLAY / FORM / LINK
    description     TEXT         NOT NULL,
    param_desc      TEXT,                                      -- 参数说明
    enabled         BOOLEAN      NOT NULL DEFAULT TRUE,
    sort_order      INT          NOT NULL DEFAULT 0,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

INSERT INTO ai_widget_type (widget_code, widget_name, category, description, param_desc, sort_order)
VALUES
('category-list', '标签类目列表', 'DISPLAY',
 '展示标签类目列表，支持搜索、筛选和分页',
 'filters 支持 status(ACTIVE/INACTIVE)、keyword；limit 控制每页条数', 1),

('category-form', '创建标签类目', 'FORM',
 '在对话中直接创建标签类目，用户填写后提交',
 'initialValues 可预填 categoryCode、categoryName、description', 2),

('link', '页面跳转链接', 'LINK',
 '跳转到系统页面，可带筛选参数',
 'page 为目标路径（如 /app/tag-categories），filters 为筛选参数，label 为按钮文字', 10)
ON CONFLICT (widget_code) DO NOTHING;
