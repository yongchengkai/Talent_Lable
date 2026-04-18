-- =============================================
-- AI Skill 管理 + 对话系统表结构 V2
-- =============================================

-- 1. AI Skill 定义表
CREATE TABLE ai_skill (
    id              BIGSERIAL PRIMARY KEY,
    skill_code      VARCHAR(64)  NOT NULL,
    skill_name      VARCHAR(128) NOT NULL,
    skill_group     VARCHAR(64)  NOT NULL,
    description     VARCHAR(500) NOT NULL,
    input_schema    JSONB        NOT NULL DEFAULT '{}',
    api_method      VARCHAR(16)  NOT NULL,
    api_path        VARCHAR(256) NOT NULL,
    request_mapping JSONB,
    response_mapping JSONB,
    requires_confirm BOOLEAN     NOT NULL DEFAULT FALSE,
    prompt_template TEXT,
    status          VARCHAR(32)  NOT NULL DEFAULT 'ACTIVE',
    sort_order      INT          NOT NULL DEFAULT 0,
    created_by      VARCHAR(64)  NOT NULL,
    updated_by      VARCHAR(64)  NOT NULL,
    deleted         SMALLINT     NOT NULL DEFAULT 0,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_skill_code UNIQUE (skill_code)
);
COMMENT ON TABLE ai_skill IS 'AI Skill 定义表';
COMMENT ON COLUMN ai_skill.skill_group IS 'QUERY / MUTATION / FLOW / ANALYSIS';
COMMENT ON COLUMN ai_skill.input_schema IS 'JSON Schema 定义 Skill 入参';
COMMENT ON COLUMN ai_skill.api_method IS 'GET / POST / PUT / DELETE';
COMMENT ON COLUMN ai_skill.api_path IS '后端 API 路径，支持 {id} 占位符';
COMMENT ON COLUMN ai_skill.requires_confirm IS '写操作是否需要用户确认后执行';

-- 2. AI Skill 调用日志
CREATE TABLE ai_skill_log (
    id              BIGSERIAL PRIMARY KEY,
    skill_id        BIGINT       NOT NULL REFERENCES ai_skill(id),
    session_id      VARCHAR(64)  NOT NULL,
    input_params    JSONB,
    output_result   JSONB,
    success         BOOLEAN      NOT NULL,
    error_message   TEXT,
    duration_ms     INT          NOT NULL DEFAULT 0,
    operator_id     VARCHAR(64)  NOT NULL,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_skill_log_skill ON ai_skill_log(skill_id);
CREATE INDEX idx_skill_log_time ON ai_skill_log(created_at);

-- 3. AI 对话会话
CREATE TABLE ai_chat_session (
    id              BIGSERIAL PRIMARY KEY,
    session_id      VARCHAR(64)  NOT NULL,
    title           VARCHAR(256),
    message_count   INT          NOT NULL DEFAULT 0,
    last_message_at TIMESTAMP,
    created_by      VARCHAR(64)  NOT NULL,
    deleted         SMALLINT     NOT NULL DEFAULT 0,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_session_id UNIQUE (session_id)
);

-- 4. AI 对话消息
CREATE TABLE ai_chat_message (
    id              BIGSERIAL PRIMARY KEY,
    session_id      VARCHAR(64)  NOT NULL,
    role            VARCHAR(32)  NOT NULL,
    content         TEXT         NOT NULL,
    pending_op      JSONB,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);
COMMENT ON COLUMN ai_chat_message.role IS 'user / assistant / system';
CREATE INDEX idx_chat_msg_session ON ai_chat_message(session_id);

-- 5. 预置 Skill 数据
INSERT INTO ai_skill (skill_code, skill_name, skill_group, description, input_schema, api_method, api_path, request_mapping, response_mapping, requires_confirm, sort_order, created_by, updated_by) VALUES
('query_tag_categories', '查询标签类目', 'QUERY',
 'Search tag categories by keyword and status. Returns category list with id, code, name, status, description.',
 '{"type":"object","properties":{"keyword":{"type":"string","description":"搜索关键词"},"status":{"type":"string","description":"状态过滤: ACTIVE/INACTIVE"}},"required":[]}',
 'GET', '/tag-categories', '{"current":1,"size":20}', '{"fields":["id","categoryCode","categoryName","status","description"]}',
 FALSE, 1, 'admin', 'admin'),

('query_tag_definitions', '查询标签定义', 'QUERY',
 'Search tag definitions by keyword, status, and categoryId. Returns tag list with id, code, name, source type, category, status.',
 '{"type":"object","properties":{"keyword":{"type":"string","description":"搜索关键词"},"status":{"type":"string","description":"状态: ACTIVE/INACTIVE"},"categoryId":{"type":"integer","description":"所属类目ID"}},"required":[]}',
 'GET', '/tag-definitions', '{"current":1,"size":20}', '{"fields":["id","tagCode","tagName","tagSource","categoryId","status","description"]}',
 FALSE, 2, 'admin', 'admin'),

('query_tag_rules', '查询打标规则', 'QUERY',
 'Search tag rules by keyword, status, and ruleType. Status: DRAFT/PUBLISHED/STOPPED. RuleType: STRUCTURED/AI_SEMANTIC. Returns rule list.',
 '{"type":"object","properties":{"keyword":{"type":"string","description":"搜索关键词"},"status":{"type":"string","description":"状态: DRAFT/PUBLISHED/STOPPED"},"ruleType":{"type":"string","description":"规则类型: STRUCTURED/AI_SEMANTIC"}},"required":[]}',
 'GET', '/tag-rules', '{"current":1,"size":20}', '{"fields":["id","ruleCode","ruleName","ruleType","status","priority","versionNo","dslExplain"]}',
 FALSE, 3, 'admin', 'admin'),

('query_calc_tasks', '查询执行任务', 'QUERY',
 'Search calculation tasks by keyword, taskMode, and taskStatus. TaskMode: SIMULATION/FORMAL. TaskStatus: INIT/RUNNING/SUCCESS/FAILED.',
 '{"type":"object","properties":{"keyword":{"type":"string","description":"搜索关键词"},"taskMode":{"type":"string","description":"任务模式: SIMULATION/FORMAL"},"taskStatus":{"type":"string","description":"任务状态: INIT/RUNNING/SUCCESS/FAILED"}},"required":[]}',
 'GET', '/calc-tasks', '{"current":1,"size":20}', '{"fields":["id","taskNo","taskName","taskMode","taskStatus","submitStatus","totalCount","successCount","failCount"]}',
 FALSE, 4, 'admin', 'admin'),

('get_tag_stats', '标签覆盖率统计', 'ANALYSIS',
 'Get tag coverage statistics. Shows how many employees have been tagged by a specific tag or rule.',
 '{"type":"object","properties":{"tagId":{"type":"integer","description":"标签ID"},"ruleId":{"type":"integer","description":"规则ID"}},"required":[]}',
 'GET', '/tag-definitions/stats', NULL, NULL,
 FALSE, 5, 'admin', 'admin'),

('get_rule_impact', '规则影响预估', 'ANALYSIS',
 'Preview the impact of a tag rule - how many employees it currently affects and estimated coverage.',
 '{"type":"object","properties":{"ruleId":{"type":"integer","description":"规则ID"}},"required":["ruleId"]}',
 'GET', '/tag-rules/{id}/impact', NULL, NULL,
 FALSE, 6, 'admin', 'admin'),

('create_tag_rule', '创建打标规则', 'MUTATION',
 'Create a new tag rule in DRAFT status. Requires ruleName, ruleCode, ruleType(STRUCTURED/AI_SEMANTIC), and dslContent.',
 '{"type":"object","properties":{"ruleName":{"type":"string","description":"规则名称"},"ruleCode":{"type":"string","description":"规则编码"},"ruleType":{"type":"string","description":"STRUCTURED/AI_SEMANTIC"},"dslContent":{"type":"string","description":"DSL内容"},"dslExplain":{"type":"string","description":"规则解释"},"priority":{"type":"integer","description":"优先级"}},"required":["ruleName","ruleCode","ruleType"]}',
 'POST', '/tag-rules', NULL, NULL,
 TRUE, 10, 'admin', 'admin'),

('update_tag_rule', '修改打标规则', 'MUTATION',
 'Update a tag rule. Only DRAFT rules can be edited. For PUBLISHED rules, copy first then edit the new draft.',
 '{"type":"object","properties":{"id":{"type":"integer","description":"规则ID"},"ruleName":{"type":"string","description":"规则名称"},"dslContent":{"type":"string","description":"DSL内容"},"dslExplain":{"type":"string","description":"规则解释"},"priority":{"type":"integer","description":"优先级"}},"required":["id"]}',
 'PUT', '/tag-rules/{id}', NULL, NULL,
 TRUE, 11, 'admin', 'admin'),

('publish_tag_rule', '发布规则', 'FLOW',
 'Publish a DRAFT rule to make it active. Only DRAFT status rules can be published.',
 '{"type":"object","properties":{"id":{"type":"integer","description":"规则ID"}},"required":["id"]}',
 'POST', '/tag-rules/{id}/publish', NULL, NULL,
 TRUE, 12, 'admin', 'admin'),

('stop_tag_rule', '停用规则', 'FLOW',
 'Stop a PUBLISHED rule. The rule will no longer be used for tagging. Results from this rule will be invalidated.',
 '{"type":"object","properties":{"id":{"type":"integer","description":"规则ID"}},"required":["id"]}',
 'POST', '/tag-rules/{id}/stop', NULL, NULL,
 TRUE, 13, 'admin', 'admin'),

('copy_tag_rule', '复制规则', 'FLOW',
 'Copy a rule to create a new DRAFT version. Use this when you need to modify a PUBLISHED rule.',
 '{"type":"object","properties":{"id":{"type":"integer","description":"规则ID"}},"required":["id"]}',
 'POST', '/tag-rules/{id}/copy', NULL, NULL,
 TRUE, 14, 'admin', 'admin'),

('run_calc_task', '执行打标任务', 'FLOW',
 'Run a calculation task. Only INIT or FAILED tasks can be run.',
 '{"type":"object","properties":{"id":{"type":"integer","description":"任务ID"}},"required":["id"]}',
 'POST', '/calc-tasks/{id}/run', NULL, NULL,
 TRUE, 15, 'admin', 'admin'),

('submit_calc_task', '提交任务结果', 'FLOW',
 'Submit a completed task to persist results. Only SUCCESS + FORMAL mode tasks with PENDING submit status can be submitted.',
 '{"type":"object","properties":{"id":{"type":"integer","description":"任务ID"}},"required":["id"]}',
 'POST', '/calc-tasks/{id}/submit', NULL, NULL,
 TRUE, 16, 'admin', 'admin'),

('plan_tag_scheme', 'AI标签方案规划', 'ANALYSIS',
 'Generate a complete tagging scheme from business scenario description. Returns suggested categories, tags, and rules.',
 '{"type":"object","properties":{"scenario":{"type":"string","description":"业务场景描述"},"painPoints":{"type":"string","description":"当前痛点"},"existingData":{"type":"string","description":"现有数据说明"}},"required":["scenario"]}',
 'POST', '/ai/plan-scheme', NULL, NULL,
 FALSE, 20, 'admin', 'admin'),

('generate_dsl', 'AI生成规则DSL', 'ANALYSIS',
 'Generate DSL rule definition from natural language description. Returns structured DSL content.',
 '{"type":"object","properties":{"naturalLanguage":{"type":"string","description":"自然语言规则描述"},"context":{"type":"string","description":"上下文信息"}},"required":["naturalLanguage"]}',
 'POST', '/ai/generate-dsl', NULL, NULL,
 FALSE, 21, 'admin', 'admin');
