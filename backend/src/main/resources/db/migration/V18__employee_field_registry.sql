-- =============================================
-- 员工字段注册表（动态管理可用字段）
-- =============================================

CREATE TABLE IF NOT EXISTS employee_field_registry (
    id              BIGSERIAL PRIMARY KEY,
    field_code      VARCHAR(64)  NOT NULL UNIQUE,
    field_name      VARCHAR(128) NOT NULL,
    enabled         BOOLEAN      NOT NULL DEFAULT TRUE,
    sort_order      INT          NOT NULL DEFAULT 0,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

INSERT INTO employee_field_registry (field_code, field_name, sort_order) VALUES
('name', '姓名', 1),
('org_name', '组织', 2),
('org_path', '组织路径', 3),
('position_sequence_name', '岗位序列', 4),
('job_family_name', '职族', 5),
('job_title', '职务', 6),
('grade_level', '职级', 7),
('birth_date', '出生日期', 8),
('hire_date', '入职日期', 9),
('education', '学历', 10),
('university', '毕业院校', 11),
('resume_text', '简历全文', 12),
('project_experience', '项目经历', 13),
('employment_type', '用工类型', 14),
('employee_status', '员工状态', 15)
ON CONFLICT (field_code) DO NOTHING;
