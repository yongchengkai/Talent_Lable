-- =============================================
-- Skill 分层重构：12 个聚合 Skill
-- 对象操作(6) + 关联分析(4) + 执行控制(1) + 系统辅助(1)
-- =============================================

-- 清理旧 skill 数据
DELETE FROM ai_skill;

-- ==================== 对象操作层（6 个） ====================

INSERT INTO ai_skill (skill_code, skill_name, category, description, when_to_use, tool_name, requires_confirm, enabled, sort_order, created_by, updated_by)
VALUES ('manage_category', '管理标签类目', 'MUTATION',
        '对标签类目执行操作。支持的 action：list(查询列表), get(查看详情), create(创建), update(编辑), enable(启用), disable(停用), delete(删除)。操作前会自动检查约束条件。',
        '当用户要查看、创建、编辑、启用、停用或删除标签类目时使用',
        'manageCategory', TRUE, TRUE, 1, 'admin', 'admin');

INSERT INTO ai_skill (skill_code, skill_name, category, description, when_to_use, tool_name, requires_confirm, enabled, sort_order, created_by, updated_by)
VALUES ('manage_tag', '管理标签', 'MUTATION',
        '对标签定义执行操作。支持的 action：list(查询列表), get(查看详情), create(创建), update(编辑), enable(启用), disable(停用), delete(删除), migrate(迁移类目)。操作前会自动检查引用关系和约束条件。',
        '当用户要查看、创建、编辑、启用、停用、删除或迁移标签时使用',
        'manageTag', TRUE, TRUE, 2, 'admin', 'admin');

INSERT INTO ai_skill (skill_code, skill_name, category, description, when_to_use, tool_name, requires_confirm, enabled, sort_order, created_by, updated_by)
VALUES ('manage_rule', '管理打标规则', 'MUTATION',
        '对打标规则执行操作。支持的 action：list(查询列表), get(查看详情), create(创建), update(编辑), publish(发布), unpublish(撤销发布), copy(复制), delete(删除)。自动检查发布状态和正式任务引用约束。',
        '当用户要查看、创建、编辑、发布、撤销、复制或删除打标规则时使用',
        'manageRule', TRUE, TRUE, 3, 'admin', 'admin');

INSERT INTO ai_skill (skill_code, skill_name, category, description, when_to_use, tool_name, requires_confirm, enabled, sort_order, created_by, updated_by)
VALUES ('manage_task', '管理打标任务', 'MUTATION',
        '对打标任务执行操作。支持的 action：list(查询列表), get(查看详情), create(创建), update(编辑), run(运行), submit(提交审批), revoke(撤销), delete(删除)。自动检查任务状态和模式约束。',
        '当用户要查看、创建、编辑、运行、提交、撤销或删除打标任务时使用',
        'manageTask', TRUE, TRUE, 4, 'admin', 'admin');

INSERT INTO ai_skill (skill_code, skill_name, category, description, when_to_use, tool_name, requires_confirm, enabled, sort_order, created_by, updated_by)
VALUES ('manage_approval', '管理打标审批', 'MUTATION',
        '对打标审批执行操作。支持的 action：list(查询待审批列表), approve(通过), reject(驳回)。审批通过后标签结果正式生效。',
        '当用户要查看待审批任务、通过或驳回审批时使用',
        'manageApproval', TRUE, TRUE, 5, 'admin', 'admin');

INSERT INTO ai_skill (skill_code, skill_name, category, description, when_to_use, tool_name, requires_confirm, enabled, sort_order, created_by, updated_by)
VALUES ('query_employee', '查询员工', 'QUERY',
        '查询员工信息。支持的 action：list(查询列表，支持按姓名/工号/组织/职级筛选), get(查看详情，含当前有效标签), orgTree(查看组织树)。员工数据由外部系统维护，本系统只读。',
        '当用户要查看员工信息、员工标签或组织结构时使用',
        'queryEmployee', FALSE, TRUE, 6, 'admin', 'admin');

-- ==================== 关联分析层（4 个） ====================

INSERT INTO ai_skill (skill_code, skill_name, category, description, when_to_use, tool_name, requires_confirm, enabled, sort_order, created_by, updated_by)
VALUES ('check_references', '检查引用关系', 'ANALYSIS',
        '检查任意对象的引用关系。支持：标签被哪些规则引用、规则被哪些任务引用、类目下有多少标签、员工有多少有效标签等。在执行停用、删除、撤销等操作前必须先调用此工具。',
        '在执行任何可能受引用关系约束的操作前使用，如停用标签、删除规则、撤销发布等',
        'checkReferences', FALSE, TRUE, 10, 'admin', 'admin');

INSERT INTO ai_skill (skill_code, skill_name, category, description, when_to_use, tool_name, requires_confirm, enabled, sort_order, created_by, updated_by)
VALUES ('analyze_impact', '分析影响范围', 'ANALYSIS',
        '分析操作的影响范围。支持：停用标签影响哪些规则、撤销规则影响哪些结果、修改规则影响多少员工、停用类目的连锁影响等。返回影响摘要和建议操作。',
        '在执行写操作前分析影响范围，帮助用户决策是否继续',
        'analyzeImpact', FALSE, TRUE, 11, 'admin', 'admin');

INSERT INTO ai_skill (skill_code, skill_name, category, description, when_to_use, tool_name, requires_confirm, enabled, sort_order, created_by, updated_by)
VALUES ('analyze_change', '变更影响分析', 'ANALYSIS',
        '分析员工数据变更对标签规则的影响，给出需要刷新的规则和建议操作',
        '当用户点击变更通知、询问某个员工数据变更的影响、或需要分析变更后哪些标签需要更新时使用',
        'analyzeChange', FALSE, TRUE, 12, 'admin', 'admin');

INSERT INTO ai_skill (skill_code, skill_name, category, description, when_to_use, tool_name, requires_confirm, enabled, sort_order, created_by, updated_by)
VALUES ('generate_dsl', 'AI 生成规则 DSL', 'ANALYSIS',
        '根据用户的自然语言描述生成条件打标规则的 JSON DSL。用户描述规则目标和条件，AI 生成可直接使用的 DSL 草稿。',
        '当用户要创建或修改条件打标规则、用自然语言描述规则逻辑时使用',
        'generateRuleDsl', FALSE, TRUE, 13, 'admin', 'admin');

-- ==================== 执行控制层（1 个） ====================

INSERT INTO ai_skill (skill_code, skill_name, category, description, when_to_use, tool_name, requires_confirm, enabled, sort_order, created_by, updated_by)
VALUES ('confirm_operation', '确认执行操作', 'SYSTEM',
        '用户确认后实际执行待确认的操作。所有写操作都会先生成待确认记录，用户确认后通过此工具执行。',
        '当用户确认要执行之前提出的操作计划时使用',
        'confirmOperation', FALSE, TRUE, 20, 'admin', 'admin');

-- ==================== 系统辅助层（1 个） ====================

INSERT INTO ai_skill (skill_code, skill_name, category, description, when_to_use, tool_name, requires_confirm, enabled, sort_order, created_by, updated_by)
VALUES ('get_tag_stats', '标签统计概览', 'QUERY',
        '获取标签体系的统计概览：类目数量、标签数量（按状态）、规则数量（按类型和状态）、任务数量（按状态）、员工标签覆盖率等。',
        '当用户询问系统整体情况、标签覆盖率、规则统计等概览信息时使用',
        'getTagStats', FALSE, TRUE, 21, 'admin', 'admin');
