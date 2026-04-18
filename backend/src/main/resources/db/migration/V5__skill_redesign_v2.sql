-- =============================================
-- V5: Skill 系统重新设计
-- 从"API 网关配置"模式 → "自然语言能力描述"模式
-- =============================================

-- 1. 删除旧表（有外键依赖，先删日志）
DROP TABLE IF EXISTS ai_skill_log;
DROP TABLE IF EXISTS ai_skill;

-- 2. 新建精简版 ai_skill 表
CREATE TABLE ai_skill (
    id              BIGSERIAL PRIMARY KEY,
    skill_code      VARCHAR(64)  NOT NULL,
    skill_name      VARCHAR(128) NOT NULL,
    category        VARCHAR(32)  NOT NULL DEFAULT 'GENERAL',
    description     TEXT         NOT NULL,
    when_to_use     TEXT,
    tool_name       VARCHAR(100) NOT NULL,
    requires_confirm BOOLEAN     NOT NULL DEFAULT FALSE,
    enabled         BOOLEAN      NOT NULL DEFAULT TRUE,
    sort_order      INT          NOT NULL DEFAULT 0,
    created_by      VARCHAR(64)  NOT NULL DEFAULT 'system',
    updated_by      VARCHAR(64)  NOT NULL DEFAULT 'system',
    deleted         SMALLINT     NOT NULL DEFAULT 0,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_skill_code_v2 UNIQUE (skill_code)
);
COMMENT ON TABLE ai_skill IS 'AI 技能定义表（自然语言描述版）';
COMMENT ON COLUMN ai_skill.category IS 'QUERY / MUTATION / ANALYSIS / SYSTEM';
COMMENT ON COLUMN ai_skill.description IS '技能做什么（自然语言描述）';
COMMENT ON COLUMN ai_skill.when_to_use IS '什么时候该用这个技能（自然语言描述）';
COMMENT ON COLUMN ai_skill.tool_name IS '映射到 Java FunctionCallback bean 名';

-- 3. 新建精简版调用日志表
CREATE TABLE ai_skill_log (
    id              BIGSERIAL PRIMARY KEY,
    skill_id        BIGINT       NOT NULL,
    session_id      VARCHAR(64)  NOT NULL,
    tool_name       VARCHAR(100) NOT NULL,
    input_params    JSONB,
    output_result   JSONB,
    success         BOOLEAN      NOT NULL,
    error_message   TEXT,
    duration_ms     INT          NOT NULL DEFAULT 0,
    operator_id     VARCHAR(64)  NOT NULL DEFAULT 'system',
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_skill_log_v2_skill ON ai_skill_log(skill_id);
CREATE INDEX idx_skill_log_v2_time ON ai_skill_log(created_at);

-- 4. 新建待确认操作表（替代 Redis 存储）
CREATE TABLE ai_pending_operation (
    id              BIGSERIAL PRIMARY KEY,
    session_id      VARCHAR(64)  NOT NULL,
    skill_code      VARCHAR(64)  NOT NULL,
    operation_desc  TEXT         NOT NULL,
    operation_data  JSONB,
    impact_summary  TEXT,
    status          VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMP,
    deleted         SMALLINT     NOT NULL DEFAULT 0
);
COMMENT ON TABLE ai_pending_operation IS '待确认操作表';
COMMENT ON COLUMN ai_pending_operation.status IS 'PENDING / CONFIRMED / REJECTED / EXPIRED';
CREATE INDEX idx_pending_op_session ON ai_pending_operation(session_id, status);

-- 5. 预置技能数据
INSERT INTO ai_skill (skill_code, skill_name, category, description, when_to_use, tool_name, requires_confirm, sort_order, created_by, updated_by) VALUES

('search_rules', '搜索打标规则', 'QUERY',
 '根据关键词搜索打标规则。支持按规则名称、规则编码、标签名称等模糊匹配。返回规则列表含名称、类型、状态、版本等摘要信息。',
 '当用户提到规则、想查找某条规则、或者需要定位规则再做后续操作时使用。例如"核心骨干的规则是什么"、"有哪些已发布的规则"、"P7相关的规则"。',
 'searchRules', false, 1, 'system', 'system'),

('get_rule_detail', '查看规则详情', 'QUERY',
 '获取指定规则的完整信息，包括条件配置、输出标签、适用范围、版本历史等。',
 '当用户想了解某条规则的具体配置时使用。通常在搜索到规则后，用户追问"详细看看"时调用。',
 'getRuleDetail', false, 2, 'system', 'system'),

('search_tags', '搜索标签', 'QUERY',
 '搜索标签定义和标签类目。支持按名称、编码、类目、来源类型筛选。',
 '当用户询问标签相关信息时使用。例如"有哪些能力标签"、"核心骨干是什么标签"。',
 'searchTags', false, 3, 'system', 'system'),

('search_employees', '搜索员工', 'QUERY',
 '根据条件搜索员工信息。支持按姓名、组织、职级、岗位序列等查询。返回员工列表摘要。',
 '当用户想查找员工、了解某些员工的情况时使用。例如"P7以上的技术人员有哪些"、"张明的信息"。',
 'searchEmployees', false, 4, 'system', 'system'),

('search_tasks', '搜索执行任务', 'QUERY',
 '搜索打标执行任务。支持按任务模式（模拟/正式）、状态筛选。返回任务列表含执行结果摘要。',
 '当用户询问任务执行情况时使用。例如"最近的模拟任务结果怎么样"、"有没有待提交的任务"。',
 'searchTasks', false, 5, 'system', 'system'),

('estimate_rule_impact', '评估规则影响', 'ANALYSIS',
 '评估一条规则当前或修改后会影响多少员工。返回命中人数、示例员工名单、与当前结果的对比。',
 '在修改规则之前自动调用，让用户了解变更影响范围。也可以单独用于分析某条规则的覆盖情况。',
 'estimateRuleImpact', false, 10, 'system', 'system'),

('get_tag_stats', '标签统计分析', 'ANALYSIS',
 '统计标签的覆盖率、分布情况。可按类目、来源类型等维度汇总。',
 '当用户想了解标签整体情况、覆盖率、分布时使用。例如"各类标签覆盖了多少人"、"能力标签的分布"。',
 'getTagStats', false, 11, 'system', 'system'),

('generate_rule_dsl', '生成规则条件', 'ANALYSIS',
 '根据自然语言描述生成结构化的规则条件（DSL）。将用户的业务语言转换为系统可执行的规则配置。',
 '当用户用自然语言描述规则逻辑时使用。例如"P8以上且司龄满3年"会生成对应的条件表达式。',
 'generateRuleDsl', false, 12, 'system', 'system'),

('update_rule', '修改打标规则', 'MUTATION',
 '修改指定规则的条件、输出标签或适用范围。对于已发布/已运行的规则，会自动先复制为新草稿再修改。修改前必须展示影响分析，等待用户确认。',
 '当用户明确要求修改规则时使用。例如"把核心骨干的规则从P7调到P8"、"修改这条规则的条件"。',
 'updateRule', true, 20, 'system', 'system'),

('create_rule', '创建打标规则', 'MUTATION',
 '根据用户描述创建新的打标规则。自动生成规则编码，初始状态为草稿。创建前展示规则预览，等待确认。',
 '当用户想新建一条打标规则时使用。例如"创建一条规则：P8以上且985毕业的标记为高潜人才"。',
 'createRule', true, 21, 'system', 'system'),

('publish_rule', '发布规则', 'MUTATION',
 '将未发布状态的规则发布为生效状态。发布后规则不可直接编辑，需复制新版本。',
 '当用户要求发布某条规则时使用。例如"把这条规则发布了"、"让这条规则生效"。',
 'publishRule', true, 22, 'system', 'system'),

('unpublish_rule', '撤销发布规则', 'MUTATION',
 '撤销已发布的规则，使其回到未发布状态。撤销后该规则产出的标签结果将失效。',
 '当用户要求停用或撤销某条规则时使用。例如"停掉这条规则"、"撤销发布"。',
 'unpublishRule', true, 23, 'system', 'system'),

('copy_rule', '复制规则', 'MUTATION',
 '复制一条规则生成新的草稿版本。常用于修改已发布规则的场景——先复制再编辑。',
 '当需要基于现有规则创建新版本时使用。通常由修改规则的流程自动触发。',
 'copyRule', true, 24, 'system', 'system'),

('run_task', '执行打标任务', 'MUTATION',
 '执行一个打标任务（模拟或正式）。只有初始化或失败状态的任务可以执行。',
 '当用户要求运行打标任务时使用。例如"跑一下这个模拟任务"、"执行正式打标"。',
 'runTask', true, 25, 'system', 'system'),

('submit_task', '提交任务结果', 'MUTATION',
 '提交正式任务的执行结果，将标签结果持久化。只有正式模式且执行成功的任务可以提交。',
 '当用户要求提交任务结果时使用。例如"提交这个任务的结果"。',
 'submitTask', true, 26, 'system', 'system'),

('confirm_operation', '确认执行操作', 'SYSTEM',
 '执行一个之前创建的待确认操作。在用户明确同意后，实际执行变更。',
 '当用户对之前展示的操作方案表示确认时使用。例如用户说"确认"、"执行吧"、"可以"。',
 'confirmOperation', false, 99, 'system', 'system');
