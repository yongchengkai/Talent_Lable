-- =============================================
-- 数据变更感知 + 通知系统
-- =============================================

-- 1. 员工变更日志（由 PG 触发器自动写入）
CREATE TABLE employee_change_log (
    id              BIGSERIAL PRIMARY KEY,
    employee_id     BIGINT       NOT NULL,
    employee_no     VARCHAR(64)  NOT NULL,
    change_type     VARCHAR(10)  NOT NULL,          -- INSERT / UPDATE
    field_code      VARCHAR(64)  NOT NULL,
    old_value       TEXT,
    new_value       TEXT,
    processed       BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_ecl_unprocessed ON employee_change_log(processed) WHERE processed = FALSE;
CREATE INDEX idx_ecl_employee ON employee_change_log(employee_id);

-- 2. 变更通知
CREATE TABLE change_notification (
    id                BIGSERIAL PRIMARY KEY,
    employee_id       BIGINT       NOT NULL,
    employee_no       VARCHAR(64)  NOT NULL,
    employee_name     VARCHAR(128),
    change_type       VARCHAR(20)  NOT NULL,         -- INSERT / UPDATE / STATUS_CHANGE
    change_summary    TEXT         NOT NULL,
    changed_fields    TEXT         NOT NULL DEFAULT '[]',
    affected_rules    TEXT         NOT NULL DEFAULT '[]',
    severity          VARCHAR(10)  NOT NULL DEFAULT 'INFO',  -- INFO / WARN / CRITICAL
    status            VARCHAR(20)  NOT NULL DEFAULT 'UNREAD', -- UNREAD / READ / DISMISSED / PROCESSED
    processed_task_id BIGINT,
    created_at        TIMESTAMP    NOT NULL DEFAULT NOW(),
    read_at           TIMESTAMP,
    deleted           SMALLINT     NOT NULL DEFAULT 0
);
CREATE INDEX idx_cn_status ON change_notification(status) WHERE deleted = 0;
CREATE INDEX idx_cn_created ON change_notification(created_at DESC);

-- 3. calc_task 扩展
ALTER TABLE calc_task ADD COLUMN trigger_type VARCHAR(20) NOT NULL DEFAULT 'MANUAL';
ALTER TABLE calc_task ADD COLUMN notification_id BIGINT;
COMMENT ON COLUMN calc_task.trigger_type IS 'MANUAL / AUTO_CHANGE';

-- 4. 触发器函数：记录 employee 表的字段级变更
CREATE OR REPLACE FUNCTION fn_employee_change_log() RETURNS TRIGGER AS $$
DECLARE
    fields TEXT[] := ARRAY[
        'name','org_id','org_name','org_path',
        'position_sequence_code','position_sequence_name',
        'job_family_code','job_family_name',
        'job_title','grade_level',
        'birth_date','hire_date',
        'education','university',
        'resume_text','project_experience',
        'employment_type','employee_status'
    ];
    f TEXT;
    old_val TEXT;
    new_val TEXT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        FOREACH f IN ARRAY fields LOOP
            new_val := row_to_json(NEW)->>f;
            IF new_val IS NOT NULL THEN
                INSERT INTO employee_change_log(employee_id, employee_no, change_type, field_code, old_value, new_value)
                VALUES (NEW.id, NEW.employee_no, 'INSERT', f, NULL, new_val);
            END IF;
        END LOOP;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        FOREACH f IN ARRAY fields LOOP
            old_val := row_to_json(OLD)->>f;
            new_val := row_to_json(NEW)->>f;
            IF old_val IS DISTINCT FROM new_val THEN
                INSERT INTO employee_change_log(employee_id, employee_no, change_type, field_code, old_value, new_value)
                VALUES (NEW.id, NEW.employee_no, 'UPDATE', f, old_val, new_val);
            END IF;
        END LOOP;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_employee_change
AFTER INSERT OR UPDATE ON employee
FOR EACH ROW EXECUTE FUNCTION fn_employee_change_log();

-- 5. 注册 AI 分析工具
INSERT INTO ai_skill (skill_code, skill_name, category, description, when_to_use, tool_name, requires_confirm, enabled, sort_order, created_by, updated_by)
VALUES ('analyze_change', '变更影响分析', 'ANALYSIS',
        '分析员工数据变更对标签规则的影响，给出需要刷新的规则和建议操作',
        '当用户点击变更通知、询问某个员工数据变更的影响、或需要分析变更后哪些标签需要更新时使用',
        'analyzeChange', FALSE, TRUE, 25, 'admin', 'admin');
