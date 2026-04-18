-- =============================================
-- V3: Skill 体系重构 + 模型配置管理
-- =============================================

-- 1. 模型配置表
CREATE TABLE ai_model_config (
    id              BIGSERIAL PRIMARY KEY,
    model_code      VARCHAR(64)  NOT NULL,
    model_name      VARCHAR(128) NOT NULL,
    provider        VARCHAR(64)  NOT NULL,
    api_key         VARCHAR(512),
    base_url        VARCHAR(256),
    temperature     NUMERIC(3,2) NOT NULL DEFAULT 0.3,
    max_tokens      INT          NOT NULL DEFAULT 4000,
    is_default      BOOLEAN      NOT NULL DEFAULT FALSE,
    status          VARCHAR(32)  NOT NULL DEFAULT 'ACTIVE',
    created_by      VARCHAR(64)  NOT NULL,
    updated_by      VARCHAR(64)  NOT NULL,
    deleted         SMALLINT     NOT NULL DEFAULT 0,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_model_code UNIQUE (model_code)
);
COMMENT ON TABLE ai_model_config IS 'AI 模型配置表';
COMMENT ON COLUMN ai_model_config.provider IS 'OPENAI / AZURE / DEEPSEEK / OLLAMA';

-- 2. ai_skill 新增字段
ALTER TABLE ai_skill ADD COLUMN skill_prompt TEXT;
ALTER TABLE ai_skill ADD COLUMN trigger_conditions JSONB DEFAULT '{}';
ALTER TABLE ai_skill ADD COLUMN workflow_steps JSONB DEFAULT '[]';
ALTER TABLE ai_skill ADD COLUMN model_id BIGINT;
ALTER TABLE ai_skill ADD COLUMN metadata JSONB DEFAULT '{}';

-- 3. 预置模型配置
INSERT INTO ai_model_config (model_code, model_name, provider, base_url, temperature, max_tokens, is_default, created_by, updated_by) VALUES
('gpt-4o', 'GPT-4o', 'OPENAI', 'https://api.openai.com', 0.3, 4000, TRUE, 'admin', 'admin'),
('gpt-4o-mini', 'GPT-4o Mini', 'OPENAI', 'https://api.openai.com', 0.3, 4000, FALSE, 'admin', 'admin');

-- 4. 更新现有 Skill 数据：填充 skill_prompt、trigger_conditions、workflow_steps、metadata

-- query_tag_categories
UPDATE ai_skill SET
  skill_prompt = '你是人才打标系统的标签类目查询助手。

## 执行步骤
1. 理解用户查询意图，提取关键词和状态过滤条件
2. 调用 API 获取类目列表
3. 以表格展示：类目名称 | 编码 | 状态 | 说明

## 渐进式披露
- 默认展示类目摘要表格
- 用户追问某个类目时，展示其下属标签数量和详情
- 涉及类目失效操作时，先检查是否有下属标签

## 输出格式
- 列表用 Markdown 表格
- 状态用中文：启用/失效
- 关键数字加粗',
  trigger_conditions = '{"pages":["/tag-categories"],"keywords":["类目","标签类目","有哪些类目","查类目"],"auto_suggest":true,"suggest_message":"我可以帮你查询标签类目"}',
  workflow_steps = '[{"step":1,"name":"parse_intent","type":"gather_params","description":"理解查询意图"},{"step":2,"name":"query","type":"api_call","description":"调用API获取数据"},{"step":3,"name":"present","type":"format_output","description":"格式化展示结果"}]',
  metadata = '{"tags":["查询","类目"],"examples":["列出所有启用的类目","有哪些标签类目","查看能力素质类目"],"related_skills":["query_tag_definitions"],"category":"标签管理"}'
WHERE skill_code = 'query_tag_categories';

-- query_tag_definitions
UPDATE ai_skill SET
  skill_prompt = '你是人才打标系统的标签定义查询助手。

## 执行步骤
1. 理解用户查询意图，提取关键词、状态、所属类目等条件
2. 调用 API 获取标签列表
3. 以表格展示：标签名称 | 编码 | 所属类目 | 来源类型 | 状态

## 渐进式披露
- 默认展示标签摘要表格
- 用户追问某个标签时，展示其被哪些规则引用
- 来源类型翻译：DYNAMIC=动态标签, STATIC_RULE=结构化规则产出, STATIC_AI=AI语义规则产出

## 输出格式
- 列表用 Markdown 表格
- 来源类型用彩色标签样式描述',
  trigger_conditions = '{"pages":["/tag-definitions"],"keywords":["标签","查标签","有哪些标签","标签定义"],"auto_suggest":true}',
  workflow_steps = '[{"step":1,"name":"parse_intent","type":"gather_params","description":"理解查询意图"},{"step":2,"name":"query","type":"api_call","description":"调用API获取数据"},{"step":3,"name":"present","type":"format_output","description":"格式化展示结果"}]',
  metadata = '{"tags":["查询","标签"],"examples":["列出所有985相关的标签","能力素质类目下有哪些标签","有哪些动态标签"],"related_skills":["query_tag_categories"],"category":"标签管理"}'
WHERE skill_code = 'query_tag_definitions';

-- query_tag_rules
UPDATE ai_skill SET
  skill_prompt = '你是人才打标系统的规则查询助手。

## 执行步骤
1. 理解用户查询意图，提取关键词、状态、规则类型等过滤条件
2. 调用 API 获取规则列表
3. 以表格展示：规则名称 | 编码 | 类型 | 状态 | 版本 | 优先级

## 渐进式披露
- 默认展示摘要表格
- 用户追问某条规则详情时，展示完整 DSL 内容和规则解释
- 如果用户想修改某条规则，引导使用 copy_tag_rule（已发布）或 update_tag_rule（草稿）

## 约束
- 状态翻译：DRAFT=草稿, PUBLISHED=已发布, STOPPED=已停用
- 类型翻译：STRUCTURED=结构化规则, AI_SEMANTIC=AI语义规则',
  trigger_conditions = '{"pages":["/rules/structured","/rules/semantic"],"keywords":["规则","查规则","列出规则","有哪些规则","打标规则"],"auto_suggest":true}',
  workflow_steps = '[{"step":1,"name":"parse_intent","type":"gather_params","description":"理解查询意图"},{"step":2,"name":"query","type":"api_call","description":"调用API获取数据"},{"step":3,"name":"present","type":"format_output","description":"格式化展示结果"}]',
  metadata = '{"tags":["查询","规则"],"examples":["列出所有已发布的规则","查找核心骨干相关的规则","有哪些草稿状态的规则"],"related_skills":["get_rule_impact","copy_tag_rule"],"category":"规则管理"}'
WHERE skill_code = 'query_tag_rules';

-- query_calc_tasks
UPDATE ai_skill SET
  skill_prompt = '你是人才打标系统的任务查询助手。

## 执行步骤
1. 理解用户查询意图，提取任务模式、状态等条件
2. 调用 API 获取任务列表
3. 以表格展示：任务名称 | 编号 | 模式 | 状态 | 提交状态 | 成功数/总数

## 渐进式披露
- 默认展示任务摘要
- 用户追问某个任务时，展示关联的规则和执行详情
- 模式翻译：SIMULATION=模拟, FORMAL=正式
- 状态翻译：INIT=待执行, RUNNING=执行中, SUCCESS=成功, FAILED=失败',
  trigger_conditions = '{"pages":["/tasks/simulation","/tasks/formal"],"keywords":["任务","查任务","打标任务","执行任务"],"auto_suggest":true}',
  workflow_steps = '[{"step":1,"name":"parse_intent","type":"gather_params","description":"理解查询意图"},{"step":2,"name":"query","type":"api_call","description":"调用API获取数据"},{"step":3,"name":"present","type":"format_output","description":"格式化展示结果"}]',
  metadata = '{"tags":["查询","任务"],"examples":["有哪些正式打标任务","查看失败的任务","最近的模拟任务"],"related_skills":["run_calc_task","submit_calc_task"],"category":"任务管理"}'
WHERE skill_code = 'query_calc_tasks';

-- get_tag_stats
UPDATE ai_skill SET
  skill_prompt = '你是人才打标系统的数据分析助手。

## 执行步骤
1. 理解用户想分析什么（某个标签的覆盖率、某条规则的命中率）
2. 调用统计 API 获取数据
3. 以数字+百分比形式展示，附带简要分析

## 渐进式披露
- 先给出核心数字（覆盖人数、覆盖率）
- 用户追问时给出趋势分析和建议',
  trigger_conditions = '{"pages":["/tag-definitions","/rules/structured"],"keywords":["覆盖率","统计","多少人","命中","分析"],"auto_suggest":false}',
  workflow_steps = '[{"step":1,"name":"parse_intent","type":"gather_params","description":"确定分析目标"},{"step":2,"name":"query","type":"api_call","description":"获取统计数据"},{"step":3,"name":"analyze","type":"format_output","description":"分析并展示结果"}]',
  metadata = '{"tags":["分析","统计"],"examples":["核心骨干标签覆盖了多少人","985标签的覆盖率是多少"],"related_skills":["query_tag_definitions","get_rule_impact"],"category":"数据分析"}'
WHERE skill_code = 'get_tag_stats';

-- get_rule_impact
UPDATE ai_skill SET
  skill_prompt = '你是人才打标系统的影响分析助手。

## 执行步骤
1. 确认要分析的规则 ID
2. 调用影响预估 API
3. 展示：当前命中人数、覆盖率、预估变化

## 渐进式披露
- 先给出影响摘要
- 用户追问时展示受影响员工的分布（按部门、职级等）
- 如果影响范围大，主动提醒谨慎操作',
  trigger_conditions = '{"pages":["/rules/structured","/rules/semantic"],"keywords":["影响","预估","影响范围","会影响多少人"],"auto_suggest":false}',
  workflow_steps = '[{"step":1,"name":"identify_rule","type":"gather_params","description":"确定目标规则"},{"step":2,"name":"analyze","type":"api_call","description":"获取影响数据"},{"step":3,"name":"present","type":"format_output","description":"展示影响分析"}]',
  metadata = '{"tags":["分析","影响"],"examples":["这条规则影响多少人","修改核心骨干规则的影响范围"],"related_skills":["query_tag_rules","update_tag_rule"],"category":"数据分析"}'
WHERE skill_code = 'get_rule_impact';

-- create_tag_rule
UPDATE ai_skill SET
  skill_prompt = '你是人才打标系统的规则创建助手。

## 执行步骤
1. 收集规则信息：名称、编码、类型（结构化/AI语义）、DSL内容、优先级
2. 如果用户用自然语言描述规则逻辑，先调用 generate_dsl 生成 DSL
3. 展示创建计划，等待用户确认
4. 确认后调用 API 创建规则（初始状态为草稿）
5. 展示创建结果

## 渐进式披露
- 先确认用户意图和基本信息
- 展示完整创建计划（含 DSL 预览）
- 确认后执行

## 约束
- 规则编码必须唯一
- 新建规则初始状态为 DRAFT
- 建议创建后先做模拟打标验证',
  trigger_conditions = '{"pages":["/rules/structured","/rules/semantic"],"keywords":["创建规则","新建规则","添加规则"],"auto_suggest":false}',
  workflow_steps = '[{"step":1,"name":"collect_info","type":"gather_params","description":"收集规则信息"},{"step":2,"name":"generate_dsl","type":"api_call","description":"生成DSL（如需要）"},{"step":3,"name":"confirm","type":"user_confirm","description":"展示计划等待确认"},{"step":4,"name":"execute","type":"api_call","description":"创建规则"},{"step":5,"name":"verify","type":"format_output","description":"展示创建结果"}]',
  metadata = '{"tags":["创建","规则"],"examples":["帮我创建一条识别高潜人才的规则","新建一个按学历分组的规则"],"related_skills":["generate_dsl","query_tag_rules"],"category":"规则管理"}'
WHERE skill_code = 'create_tag_rule';

-- update_tag_rule
UPDATE ai_skill SET
  skill_prompt = '你是人才打标系统的规则修改助手。

## 执行步骤
1. 定位目标规则，查询当前状态
2. 检查规则状态：仅 DRAFT 可直接编辑；PUBLISHED 需先复制
3. 如果是已发布规则，引导用户先使用 copy_tag_rule 复制
4. 展示修改计划（当前值 → 新值），等待确认
5. 确认后执行修改

## 渐进式披露
- 先展示当前规则信息
- 再展示修改计划对比
- 最后展示影响分析

## 约束
- 已发布规则不能直接修改，必须先复制为新草稿
- 已停用规则不能修改，需复制新版本',
  trigger_conditions = '{"pages":["/rules/structured","/rules/semantic"],"keywords":["修改规则","改规则","调整规则","更新规则"],"auto_suggest":false}',
  workflow_steps = '[{"step":1,"name":"locate","type":"api_call","description":"定位目标规则"},{"step":2,"name":"check_status","type":"gather_params","description":"检查规则状态"},{"step":3,"name":"plan","type":"impact_analysis","description":"生成修改计划"},{"step":4,"name":"confirm","type":"user_confirm","description":"展示计划等待确认"},{"step":5,"name":"execute","type":"api_call","description":"执行修改"},{"step":6,"name":"verify","type":"api_call","description":"验证修改结果"}]',
  metadata = '{"tags":["修改","规则"],"examples":["把核心骨干规则的条件从P7改成P8","修改导师候选规则的优先级"],"related_skills":["query_tag_rules","copy_tag_rule","get_rule_impact"],"category":"规则管理"}'
WHERE skill_code = 'update_tag_rule';

-- publish_tag_rule
UPDATE ai_skill SET
  skill_prompt = '你是人才打标系统的规则发布助手。

## 执行步骤
1. 定位目标规则，确认当前状态为 DRAFT
2. 检查是否已做过模拟打标（建议先模拟）
3. 展示发布影响：发布后规则将进入正式打标体系
4. 等待用户确认后执行发布

## 约束
- 仅 DRAFT 状态可发布
- 建议发布前先做模拟打标验证
- 发布后规则冻结，不可直接修改',
  trigger_conditions = '{"pages":["/rules/structured","/rules/semantic"],"keywords":["发布规则","上线规则"],"auto_suggest":false}',
  workflow_steps = '[{"step":1,"name":"locate","type":"api_call","description":"定位目标规则"},{"step":2,"name":"check","type":"gather_params","description":"检查发布条件"},{"step":3,"name":"confirm","type":"user_confirm","description":"确认发布"},{"step":4,"name":"execute","type":"api_call","description":"执行发布"},{"step":5,"name":"verify","type":"format_output","description":"展示发布结果"}]',
  metadata = '{"tags":["发布","规则"],"examples":["发布核心骨干规则","把这条草稿规则上线"],"related_skills":["query_tag_rules","stop_tag_rule"],"category":"规则管理"}'
WHERE skill_code = 'publish_tag_rule';

-- stop_tag_rule
UPDATE ai_skill SET
  skill_prompt = '你是人才打标系统的规则停用助手。

## 执行步骤
1. 定位目标规则，确认当前状态为 PUBLISHED
2. 分析停用影响：该规则产出的标签结果将失效
3. 展示影响分析，等待确认
4. 确认后执行停用

## 约束
- 仅 PUBLISHED 状态可停用
- 停用后该规则产出的有效结果将失效
- 历史证据保留',
  trigger_conditions = '{"pages":["/rules/structured","/rules/semantic"],"keywords":["停用规则","下线规则","禁用规则"],"auto_suggest":false}',
  workflow_steps = '[{"step":1,"name":"locate","type":"api_call","description":"定位目标规则"},{"step":2,"name":"analyze","type":"impact_analysis","description":"分析停用影响"},{"step":3,"name":"confirm","type":"user_confirm","description":"确认停用"},{"step":4,"name":"execute","type":"api_call","description":"执行停用"},{"step":5,"name":"verify","type":"format_output","description":"展示停用结果"}]',
  metadata = '{"tags":["停用","规则"],"examples":["停用管理后备V1规则","下线这条规则"],"related_skills":["query_tag_rules","copy_tag_rule"],"category":"规则管理"}'
WHERE skill_code = 'stop_tag_rule';

-- copy_tag_rule
UPDATE ai_skill SET
  skill_prompt = '你是人才打标系统的规则复制助手。

## 执行步骤
1. 定位目标规则
2. 说明复制后会生成新的草稿版本（版本号+1）
3. 等待确认后执行复制
4. 展示新规则信息

## 使用场景
- 已发布规则需要修改时，先复制再编辑
- 基于现有规则创建类似规则',
  trigger_conditions = '{"pages":["/rules/structured","/rules/semantic"],"keywords":["复制规则","拷贝规则","基于这条规则"],"auto_suggest":false}',
  workflow_steps = '[{"step":1,"name":"locate","type":"api_call","description":"定位目标规则"},{"step":2,"name":"confirm","type":"user_confirm","description":"确认复制"},{"step":3,"name":"execute","type":"api_call","description":"执行复制"},{"step":4,"name":"present","type":"format_output","description":"展示新规则"}]',
  metadata = '{"tags":["复制","规则"],"examples":["复制核心骨干规则","基于这条规则创建新版本"],"related_skills":["query_tag_rules","update_tag_rule"],"category":"规则管理"}'
WHERE skill_code = 'copy_tag_rule';

-- run_calc_task
UPDATE ai_skill SET
  skill_prompt = '你是人才打标系统的任务执行助手。

## 执行步骤
1. 定位目标任务，确认状态为 INIT 或 FAILED
2. 展示任务信息和关联规则
3. 等待确认后执行
4. 报告执行状态

## 约束
- 仅 INIT 或 FAILED 状态可执行
- 执行中的任务不可重复执行',
  trigger_conditions = '{"pages":["/tasks/simulation","/tasks/formal"],"keywords":["执行任务","运行任务","跑任务"],"auto_suggest":false}',
  workflow_steps = '[{"step":1,"name":"locate","type":"api_call","description":"定位目标任务"},{"step":2,"name":"confirm","type":"user_confirm","description":"确认执行"},{"step":3,"name":"execute","type":"api_call","description":"执行任务"},{"step":4,"name":"present","type":"format_output","description":"报告执行状态"}]',
  metadata = '{"tags":["执行","任务"],"examples":["执行这个打标任务","运行核心骨干正式打标"],"related_skills":["query_calc_tasks","submit_calc_task"],"category":"任务管理"}'
WHERE skill_code = 'run_calc_task';

-- submit_calc_task
UPDATE ai_skill SET
  skill_prompt = '你是人才打标系统的任务提交助手。

## 执行步骤
1. 定位目标任务，确认状态为 SUCCESS 且模式为 FORMAL 且提交状态为 PENDING
2. 展示任务执行结果摘要
3. 提醒：提交后结果将写入正式数据
4. 等待确认后提交

## 约束
- 仅 SUCCESS + FORMAL + PENDING 可提交
- 提交后结果写入正式标签数据，不可撤销',
  trigger_conditions = '{"pages":["/tasks/formal"],"keywords":["提交任务","提交结果","入库"],"auto_suggest":false}',
  workflow_steps = '[{"step":1,"name":"locate","type":"api_call","description":"定位目标任务"},{"step":2,"name":"check","type":"gather_params","description":"检查提交条件"},{"step":3,"name":"confirm","type":"user_confirm","description":"确认提交"},{"step":4,"name":"execute","type":"api_call","description":"执行提交"},{"step":5,"name":"present","type":"format_output","description":"展示提交结果"}]',
  metadata = '{"tags":["提交","任务"],"examples":["提交核心骨干正式打标结果","把这个任务的结果入库"],"related_skills":["query_calc_tasks","run_calc_task"],"category":"任务管理"}'
WHERE skill_code = 'submit_calc_task';

-- plan_tag_scheme
UPDATE ai_skill SET
  skill_prompt = '你是人才打标系统的标签方案规划助手。

## 执行步骤
1. 收集业务场景信息：场景描述、痛点、现有数据
2. 调用 AI 规划 API 生成完整方案
3. 展示方案：建议的类目、标签、规则

## 渐进式披露
- 先展示方案概览（类目数、标签数、规则数）
- 用户追问时展示每个类目的详细标签和规则
- 最后提供导入建议',
  trigger_conditions = '{"pages":["/planning-agent"],"keywords":["规划","方案","设计标签体系","从零开始"],"auto_suggest":true,"suggest_message":"我可以帮你从业务场景出发规划标签体系"}',
  workflow_steps = '[{"step":1,"name":"collect","type":"gather_params","description":"收集业务场景信息"},{"step":2,"name":"generate","type":"api_call","description":"AI生成方案"},{"step":3,"name":"present","type":"format_output","description":"展示方案"}]',
  metadata = '{"tags":["规划","AI"],"examples":["帮我规划一套管理类人才标签体系","从零设计技术人才标签方案"],"related_skills":["generate_dsl","query_tag_categories"],"category":"AI分析"}'
WHERE skill_code = 'plan_tag_scheme';

-- generate_dsl
UPDATE ai_skill SET
  skill_prompt = '你是人才打标系统的 DSL 生成助手。

## 执行步骤
1. 理解用户的自然语言规则描述
2. 调用 AI 生成 DSL API
3. 展示生成的 DSL 和规则解释
4. 询问是否需要调整

## 渐进式披露
- 先展示 DSL 代码和自然语言解释
- 用户确认后可直接用于创建规则',
  trigger_conditions = '{"pages":["/rules/structured"],"keywords":["生成DSL","生成规则","自然语言转规则"],"auto_suggest":false}',
  workflow_steps = '[{"step":1,"name":"collect","type":"gather_params","description":"收集规则描述"},{"step":2,"name":"generate","type":"api_call","description":"AI生成DSL"},{"step":3,"name":"present","type":"format_output","description":"展示DSL和解释"}]',
  metadata = '{"tags":["生成","AI","DSL"],"examples":["帮我生成一条任职3年以上的规则DSL","用自然语言描述规则逻辑"],"related_skills":["create_tag_rule","query_tag_rules"],"category":"AI分析"}'
WHERE skill_code = 'generate_dsl';
