-- V12: 优化 AI 工具描述，明确“规则引用统计”语义，减少模型误判

UPDATE ai_skill
SET description = '获取标签体系统计概览：类目数量、标签数量（按状态）、规则数量（按类型和状态）、任务数量（按状态）、员工标签覆盖率，并返回每个标签的规则引用数与未被规则引用标签列表。'
WHERE skill_code = 'get_tag_stats';

UPDATE ai_skill
SET description = '对标签定义执行操作。支持的 action：list(查询列表，返回每个标签的引用规则数)、get(查看详情), create(创建), update(编辑), enable(启用), disable(停用), delete(删除), migrate(迁移类目)。操作前会自动检查引用关系和约束条件。'
WHERE skill_code = 'manage_tag';
