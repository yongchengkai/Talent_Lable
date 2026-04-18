-- =============================================
-- 人才打标系统 - 核心表结构 V1
-- 修正原型设计中的结构性问题
-- =============================================

-- 1. 员工主数据
CREATE TABLE employee (
    id              BIGSERIAL PRIMARY KEY,
    employee_no     VARCHAR(64)  NOT NULL,
    name            VARCHAR(128) NOT NULL,
    org_id          BIGINT       NOT NULL,
    org_name        VARCHAR(128) NOT NULL,
    org_path        VARCHAR(1024) NOT NULL,
    position_sequence_code VARCHAR(64),
    position_sequence_name VARCHAR(128),
    job_family_code VARCHAR(64),
    job_family_name VARCHAR(128),
    job_title       VARCHAR(128),
    grade_level     VARCHAR(64),
    birth_date      DATE,
    hire_date       DATE,
    education       VARCHAR(64),
    university      VARCHAR(256),
    resume_text     TEXT,
    project_experience TEXT,
    employment_type VARCHAR(64),
    employee_status VARCHAR(32)  NOT NULL DEFAULT 'ACTIVE',
    deleted         SMALLINT     NOT NULL DEFAULT 0,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_employee_no UNIQUE (employee_no)
);
CREATE INDEX idx_employee_org ON employee(org_id);
CREATE INDEX idx_employee_grade ON employee(grade_level);
CREATE INDEX idx_employee_status ON employee(employee_status);

-- 2. 标签类目（去掉 exclusive_flag，类目只负责分类）
CREATE TABLE tag_category (
    id              BIGSERIAL PRIMARY KEY,
    category_code   VARCHAR(64)  NOT NULL,
    category_name   VARCHAR(128) NOT NULL,
    status          VARCHAR(32)  NOT NULL DEFAULT 'ACTIVE',
    description     VARCHAR(500),
    sort_order      INT          NOT NULL DEFAULT 0,
    created_by      VARCHAR(64)  NOT NULL,
    updated_by      VARCHAR(64)  NOT NULL,
    deleted         SMALLINT     NOT NULL DEFAULT 0,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_category_code UNIQUE (category_code)
);

-- 3. 标签定义（增加 tag_source 区分生成方式）
CREATE TABLE tag_definition (
    id              BIGSERIAL PRIMARY KEY,
    tag_code        VARCHAR(64)  NOT NULL,
    tag_name        VARCHAR(128) NOT NULL,
    category_id     BIGINT       NOT NULL REFERENCES tag_category(id),
    tag_source      VARCHAR(32)  NOT NULL DEFAULT 'STATIC_RULE',
    status          VARCHAR(32)  NOT NULL DEFAULT 'ACTIVE',
    description     VARCHAR(500),
    sort_order      INT          NOT NULL DEFAULT 0,
    created_by      VARCHAR(64)  NOT NULL,
    updated_by      VARCHAR(64)  NOT NULL,
    deleted         SMALLINT     NOT NULL DEFAULT 0,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_tag_code UNIQUE (tag_code)
);
COMMENT ON COLUMN tag_definition.tag_source IS 'DYNAMIC / STATIC_RULE / STATIC_AI';
CREATE INDEX idx_tag_category ON tag_definition(category_id);

-- 4. 规则主表（增加 rule_type、版本链、去掉 target_tag_id）
CREATE TABLE tag_rule (
    id              BIGSERIAL PRIMARY KEY,
    rule_code       VARCHAR(64)  NOT NULL,
    rule_name       VARCHAR(128) NOT NULL,
    rule_type       VARCHAR(32)  NOT NULL,
    priority        INT          NOT NULL DEFAULT 0,
    status          VARCHAR(32)  NOT NULL DEFAULT 'DRAFT',
    version_no      INT          NOT NULL DEFAULT 1,
    origin_rule_id  BIGINT,
    dsl_content     TEXT,
    dsl_explain     TEXT,
    effective_start TIMESTAMP,
    effective_end   TIMESTAMP,
    published_at    TIMESTAMP,
    published_by    VARCHAR(64),
    remark          VARCHAR(500),
    created_by      VARCHAR(64)  NOT NULL,
    updated_by      VARCHAR(64)  NOT NULL,
    deleted         SMALLINT     NOT NULL DEFAULT 0,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_rule_code UNIQUE (rule_code)
);
COMMENT ON COLUMN tag_rule.rule_type IS 'STRUCTURED / AI_SEMANTIC';
COMMENT ON COLUMN tag_rule.status IS 'DRAFT / PUBLISHED / STOPPED';
COMMENT ON COLUMN tag_rule.origin_rule_id IS '修订来源规则ID，用于版本链追踪';
CREATE INDEX idx_rule_status ON tag_rule(status);
CREATE INDEX idx_rule_origin ON tag_rule(origin_rule_id);

-- 5. 规则分支（支持多分支规则）
CREATE TABLE tag_rule_branch (
    id              BIGSERIAL PRIMARY KEY,
    rule_id         BIGINT       NOT NULL REFERENCES tag_rule(id),
    branch_name     VARCHAR(128),
    sort_order      INT          NOT NULL DEFAULT 0,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_branch_rule ON tag_rule_branch(rule_id);

-- 6. 规则分支产出标签（多对多）
CREATE TABLE tag_rule_output (
    id              BIGSERIAL PRIMARY KEY,
    rule_id         BIGINT       NOT NULL REFERENCES tag_rule(id),
    branch_id       BIGINT       REFERENCES tag_rule_branch(id),
    tag_id          BIGINT       NOT NULL REFERENCES tag_definition(id),
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_output_rule ON tag_rule_output(rule_id);
CREATE INDEX idx_output_tag ON tag_rule_output(tag_id);

-- 7. 规则条件（挂在分支上）
CREATE TABLE tag_rule_condition (
    id              BIGSERIAL PRIMARY KEY,
    rule_id         BIGINT       NOT NULL REFERENCES tag_rule(id),
    branch_id       BIGINT       REFERENCES tag_rule_branch(id),
    group_no        INT          NOT NULL DEFAULT 1,
    logic_operator  VARCHAR(16)  NOT NULL DEFAULT 'AND',
    field_code      VARCHAR(64)  NOT NULL,
    field_name      VARCHAR(128) NOT NULL,
    operator        VARCHAR(32)  NOT NULL,
    value_type      VARCHAR(32)  NOT NULL,
    value_expr      VARCHAR(500) NOT NULL,
    sort_order      INT          NOT NULL DEFAULT 0,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);
COMMENT ON COLUMN tag_rule_condition.operator IS 'EQ/NE/IN/NOT_IN/GT/GE/LT/LE/BETWEEN/LIKE';
CREATE INDEX idx_condition_rule ON tag_rule_condition(rule_id);
CREATE INDEX idx_condition_branch ON tag_rule_condition(branch_id);

-- 8. 规则适用范围
CREATE TABLE tag_rule_scope (
    id              BIGSERIAL PRIMARY KEY,
    rule_id         BIGINT       NOT NULL REFERENCES tag_rule(id),
    scope_type      VARCHAR(32)  NOT NULL,
    scope_value     VARCHAR(256) NOT NULL,
    scope_name      VARCHAR(128) NOT NULL,
    include_children BOOLEAN     NOT NULL DEFAULT FALSE,
    sort_order      INT          NOT NULL DEFAULT 0,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);
COMMENT ON COLUMN tag_rule_scope.scope_type IS 'ORG / POSITION_SEQUENCE / JOB_FAMILY';
CREATE INDEX idx_scope_rule ON tag_rule_scope(rule_id);

-- 9. AI 语义规则配置（结构化规则用 condition 表，AI 规则用这张表）
CREATE TABLE ai_rule_config (
    id              BIGSERIAL PRIMARY KEY,
    rule_id         BIGINT       NOT NULL REFERENCES tag_rule(id),
    input_fields    JSONB        NOT NULL DEFAULT '[]',
    prompt_template TEXT         NOT NULL,
    model_name      VARCHAR(64)  NOT NULL DEFAULT 'gpt-4o',
    temperature     NUMERIC(3,2) NOT NULL DEFAULT 0.3,
    max_tokens      INT          NOT NULL DEFAULT 2000,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_ai_config_rule UNIQUE (rule_id)
);
COMMENT ON COLUMN ai_rule_config.input_fields IS '输入字段列表 ["university","resume_text","project_experience"]';

-- 10. 执行任务
CREATE TABLE calc_task (
    id              BIGSERIAL PRIMARY KEY,
    task_no         VARCHAR(64)  NOT NULL,
    task_name       VARCHAR(128) NOT NULL,
    task_type       VARCHAR(32)  NOT NULL,
    task_mode       VARCHAR(32)  NOT NULL,
    task_status     VARCHAR(32)  NOT NULL DEFAULT 'INIT',
    submit_status   VARCHAR(32)  NOT NULL DEFAULT 'PENDING',
    task_scope      JSONB,
    total_count     INT          DEFAULT 0,
    success_count   INT          DEFAULT 0,
    fail_count      INT          DEFAULT 0,
    triggered_by    VARCHAR(64)  NOT NULL,
    start_time      TIMESTAMP,
    end_time        TIMESTAMP,
    error_message   TEXT,
    deleted         SMALLINT     NOT NULL DEFAULT 0,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_task_no UNIQUE (task_no)
);
COMMENT ON COLUMN calc_task.task_type IS 'FULL / RULE / ORG / EMPLOYEE';
COMMENT ON COLUMN calc_task.task_mode IS 'SIMULATION / FORMAL';
COMMENT ON COLUMN calc_task.task_status IS 'INIT / RUNNING / SUCCESS / FAILED';
COMMENT ON COLUMN calc_task.submit_status IS 'PENDING / SUBMITTED';
CREATE INDEX idx_task_status ON calc_task(task_status);

-- 11. 任务关联规则
CREATE TABLE calc_task_rule (
    id              BIGSERIAL PRIMARY KEY,
    task_id         BIGINT       NOT NULL REFERENCES calc_task(id),
    rule_id         BIGINT       NOT NULL REFERENCES tag_rule(id),
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_task_rule_task ON calc_task_rule(task_id);
CREATE INDEX idx_task_rule_rule ON calc_task_rule(rule_id);

-- 12. 员工标签结果（去掉冗余 category_id）
CREATE TABLE employee_tag_result (
    id              BIGSERIAL PRIMARY KEY,
    employee_id     BIGINT       NOT NULL REFERENCES employee(id),
    tag_id          BIGINT       NOT NULL REFERENCES tag_definition(id),
    source_rule_id  BIGINT       NOT NULL REFERENCES tag_rule(id),
    task_id         BIGINT       NOT NULL REFERENCES calc_task(id),
    hit_time        TIMESTAMP    NOT NULL DEFAULT NOW(),
    valid_flag      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX uk_result_active ON employee_tag_result(employee_id, tag_id) WHERE valid_flag = TRUE;
CREATE INDEX idx_result_employee ON employee_tag_result(employee_id);
CREATE INDEX idx_result_tag ON employee_tag_result(tag_id);
CREATE INDEX idx_result_rule ON employee_tag_result(source_rule_id);

-- 13. 结果证据明细（支持结构化和 AI 两种证据）
CREATE TABLE employee_tag_result_detail (
    id              BIGSERIAL PRIMARY KEY,
    task_id         BIGINT       NOT NULL REFERENCES calc_task(id),
    employee_id     BIGINT       NOT NULL REFERENCES employee(id),
    rule_id         BIGINT       NOT NULL REFERENCES tag_rule(id),
    tag_id          BIGINT       NOT NULL REFERENCES tag_definition(id),
    evidence_type   VARCHAR(32)  NOT NULL,
    scope_matched   BOOLEAN      NOT NULL DEFAULT FALSE,
    scope_snapshot  JSONB,
    condition_matched BOOLEAN    NOT NULL DEFAULT FALSE,
    condition_snapshot JSONB,
    ai_input_text   TEXT,
    ai_candidates   JSONB,
    ai_explanation  TEXT,
    ai_confidence   NUMERIC(5,4),
    final_decision  VARCHAR(32)  NOT NULL,
    conflict_reason VARCHAR(500),
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);
COMMENT ON COLUMN employee_tag_result_detail.evidence_type IS 'STRUCTURED / AI_SEMANTIC';
COMMENT ON COLUMN employee_tag_result_detail.final_decision IS 'HIT / REJECTED / CONFLICT_DROPPED';
COMMENT ON COLUMN employee_tag_result_detail.ai_confidence IS 'AI 置信度 0.0000~1.0000';
CREATE INDEX idx_detail_task ON employee_tag_result_detail(task_id);
CREATE INDEX idx_detail_employee ON employee_tag_result_detail(employee_id);

-- 14. 角色表
CREATE TABLE sys_role (
    id              BIGSERIAL PRIMARY KEY,
    role_code       VARCHAR(64)  NOT NULL,
    role_name       VARCHAR(128) NOT NULL,
    status          VARCHAR(32)  NOT NULL DEFAULT 'ACTIVE',
    description     VARCHAR(500),
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_role_code UNIQUE (role_code)
);

-- 15. 用户角色关系
CREATE TABLE sys_user_role (
    id              BIGSERIAL PRIMARY KEY,
    user_id         VARCHAR(64)  NOT NULL,
    role_id         BIGINT       NOT NULL REFERENCES sys_role(id),
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_user_role UNIQUE (user_id, role_id)
);

-- 16. 操作日志
CREATE TABLE operation_log (
    id              BIGSERIAL PRIMARY KEY,
    biz_type        VARCHAR(64)  NOT NULL,
    biz_id          VARCHAR(64)  NOT NULL,
    operation_type  VARCHAR(64)  NOT NULL,
    operation_before JSONB,
    operation_after  JSONB,
    operator_id     VARCHAR(64)  NOT NULL,
    operator_name   VARCHAR(128),
    operated_at     TIMESTAMP    NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_log_biz ON operation_log(biz_type, biz_id);
CREATE INDEX idx_log_operator ON operation_log(operator_id);
CREATE INDEX idx_log_time ON operation_log(operated_at);

-- 初始化角色数据
INSERT INTO sys_role (role_code, role_name, description) VALUES
('TAG_ADMIN',       '标签管理员', '管理标签类目和标签资产'),
('RULE_ADMIN',      '规则管理员', '编写和调试打标规则'),
('RULE_PUBLISHER',  '规则发布人', '发布和停用规则'),
('RESULT_VIEWER',   '结果查看人', '查询标签结果和证据'),
('SYS_ADMIN',       '系统管理员', '权限和全局治理');
