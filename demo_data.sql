-- =============================================
-- 演示数据 - 符合PRD约束
-- =============================================

-- 清理已有测试数据（保留sys_role初始数据）
DELETE FROM sys_user_role;
DELETE FROM operation_log;
DELETE FROM employee_tag_result_detail;
DELETE FROM employee_tag_result;
DELETE FROM calc_task_rule;
DELETE FROM calc_task;
DELETE FROM ai_rule_config;
DELETE FROM tag_rule_scope;
DELETE FROM tag_rule_condition;
DELETE FROM tag_rule_output;
DELETE FROM tag_rule_branch;
DELETE FROM tag_rule;
DELETE FROM tag_definition;
DELETE FROM tag_category;
DELETE FROM employee;

-- 重置序列
ALTER SEQUENCE employee_id_seq RESTART WITH 1;
ALTER SEQUENCE tag_category_id_seq RESTART WITH 1;
ALTER SEQUENCE tag_definition_id_seq RESTART WITH 1;
ALTER SEQUENCE tag_rule_id_seq RESTART WITH 1;
ALTER SEQUENCE tag_rule_branch_id_seq RESTART WITH 1;
ALTER SEQUENCE tag_rule_output_id_seq RESTART WITH 1;
ALTER SEQUENCE tag_rule_condition_id_seq RESTART WITH 1;
ALTER SEQUENCE tag_rule_scope_id_seq RESTART WITH 1;
ALTER SEQUENCE ai_rule_config_id_seq RESTART WITH 1;
ALTER SEQUENCE calc_task_id_seq RESTART WITH 1;
ALTER SEQUENCE calc_task_rule_id_seq RESTART WITH 1;
ALTER SEQUENCE employee_tag_result_id_seq RESTART WITH 1;
ALTER SEQUENCE employee_tag_result_detail_id_seq RESTART WITH 1;
ALTER SEQUENCE operation_log_id_seq RESTART WITH 1;
ALTER SEQUENCE sys_user_role_id_seq RESTART WITH 1;

-- ========== 1. 员工主数据（10名） ==========
INSERT INTO employee (employee_no, name, org_id, org_name, org_path, position_sequence_code, position_sequence_name, job_family_code, job_family_name, job_title, grade_level, birth_date, hire_date, education, university, resume_text, project_experience, employment_type, employee_status) VALUES
('EMP001', '张明', 1001, '技术研发部', '/集团/技术中心/技术研发部', 'PS_TECH', '技术序列', 'JF_DEV', '软件开发', '高级Java开发工程师', 'P7', '1990-03-15', '2018-06-01', '硕士', '清华大学', '8年Java开发经验，精通Spring Boot微服务架构，曾主导多个核心系统重构项目。', '主导电商平台微服务化改造，负责订单系统和支付系统架构设计与开发。', '正式', 'ACTIVE'),
('EMP002', '李婷', 1001, '技术研发部', '/集团/技术中心/技术研发部', 'PS_TECH', '技术序列', 'JF_DEV', '软件开发', '前端开发工程师', 'P5', '1996-07-22', '2021-07-15', '本科', '浙江大学', '3年前端开发经验，熟悉React和Vue技术栈。', '参与企业级中后台系统开发，负责数据可视化模块。', '正式', 'ACTIVE'),
('EMP003', '王强', 1002, '产品设计部', '/集团/产品中心/产品设计部', 'PS_PROD', '产品序列', 'JF_PM', '产品管理', '高级产品经理', 'P7', '1988-11-08', '2016-03-01', '硕士', '北京大学', '10年产品经验，擅长B端产品规划与用户增长策略。', '主导CRM系统从0到1建设，用户规模从0增长至50万。', '正式', 'ACTIVE'),
('EMP004', '赵雪', 1003, '人力资源部', '/集团/职能中心/人力资源部', 'PS_FUNC', '职能序列', 'JF_HR', '人力资源', 'HRBP', 'P6', '1992-05-18', '2019-09-01', '硕士', '复旦大学', '5年HR经验，专注组织发展与人才管理。', '搭建公司人才盘点体系，设计并落地九宫格评估模型。', '正式', 'ACTIVE'),
('EMP005', '陈磊', 1001, '技术研发部', '/集团/技术中心/技术研发部', 'PS_TECH', '技术序列', 'JF_DEV', '软件开发', '算法工程师', 'P8', '1987-09-30', '2015-04-01', '博士', '中国科学技术大学', '12年算法经验，专注NLP和推荐系统领域。', '主导搜索推荐系统升级，CTR提升35%。', '正式', 'ACTIVE'),
('EMP006', '刘洋', 1004, '销售一部', '/集团/营销中心/销售一部', 'PS_SALES', '销售序列', 'JF_SALES', '销售', '销售经理', 'P6', '1993-01-25', '2020-03-15', '本科', '武汉大学', '4年销售管理经验，年度业绩连续3年超额完成。', '负责华东区域大客户拓展，年度签约金额超2000万。', '正式', 'ACTIVE'),
('EMP007', '孙悦', 1001, '技术研发部', '/集团/技术中心/技术研发部', 'PS_TECH', '技术序列', 'JF_DEV', '软件开发', '测试工程师', 'P4', '1998-12-10', '2023-07-01', '本科', '华南理工大学', '1年测试经验，熟悉自动化测试框架。', '参与移动端App自动化测试体系搭建。', '正式', 'ACTIVE'),
('EMP008', '周涛', 1005, '财务部', '/集团/职能中心/财务部', 'PS_FUNC', '职能序列', 'JF_FIN', '财务', '财务主管', 'P6', '1991-08-05', '2017-11-01', '硕士', '上海交通大学', '7年财务管理经验，CPA持证。', '主导集团财务共享中心建设，实现费用报销自动化。', '正式', 'ACTIVE'),
('EMP009', '吴佳', 1002, '产品设计部', '/集团/产品中心/产品设计部', 'PS_PROD', '产品序列', 'JF_DESIGN', '设计', 'UI设计师', 'P5', '1995-04-12', '2020-08-01', '本科', '中国美术学院', '4年UI设计经验，擅长B端产品设计。', '负责企业级SaaS产品UI设计，建立设计规范和组件库。', '正式', 'ACTIVE'),
('EMP010', '郑凯', 1001, '技术研发部', '/集团/技术中心/技术研发部', 'PS_TECH', '技术序列', 'JF_DEV', '软件开发', '实习生', 'P3', '2002-06-20', '2025-06-01', '本科', '南京大学', '在校实习生，学习Java开发。', '参与内部工具开发，完成日志分析小工具。', '实习', 'ACTIVE');

-- ========== 2. 标签类目（编码前缀CAT_） ==========
INSERT INTO tag_category (category_code, category_name, status, description, sort_order, created_by, updated_by) VALUES
('CAT_ABILITY', '能力素质', 'ACTIVE', '员工核心能力与专业素质相关标签', 1, 'admin', 'admin'),
('CAT_POTENTIAL', '发展潜力', 'ACTIVE', '员工成长潜力与培养方向相关标签', 2, 'admin', 'admin'),
('CAT_EDUCATION', '学历背景', 'ACTIVE', '员工教育经历与院校背景相关标签', 3, 'admin', 'admin'),
('CAT_STABILITY', '稳定性', 'ACTIVE', '员工留任意愿与稳定性相关标签', 4, 'admin', 'admin'),
('CAT_AGE', '年龄段', 'ACTIVE', '按年龄区间划分的动态标签', 5, 'admin', 'admin'),
('CAT_TENURE', '司龄段', 'ACTIVE', '按司龄区间划分的动态标签', 6, 'admin', 'admin'),
('CAT_ARCHIVE', '已归档', 'INACTIVE', '已停用的历史标签归档类目', 7, 'admin', 'admin');

-- ========== 3. 标签定义（编码前缀TAG_） ==========
-- 能力素质类（STATIC_RULE）
INSERT INTO tag_definition (tag_code, tag_name, category_id, tag_source, status, description, sort_order, created_by, updated_by) VALUES
('TAG_CORE_BACKBONE', '核心骨干', 1, 'STATIC_RULE', 'ACTIVE', '任职时长>=3年的核心员工', 1, 'admin', 'admin'),
('TAG_MENTOR_CANDIDATE', '导师候选', 1, 'STATIC_RULE', 'ACTIVE', '职级>=P7的导师候选人', 2, 'admin', 'admin'),
('TAG_MGMT_RESERVE', '管理后备', 1, 'STATIC_RULE', 'ACTIVE', '绩效优秀的管理后备人才', 3, 'admin', 'admin');
-- 发展潜力类（STATIC_RULE）
INSERT INTO tag_definition (tag_code, tag_name, category_id, tag_source, status, description, sort_order, created_by, updated_by) VALUES
('TAG_HIGH_POTENTIAL', '高潜人才', 2, 'STATIC_RULE', 'ACTIVE', '综合评估为高潜力的员工', 1, 'admin', 'admin'),
('TAG_FAST_GROWER', '快速成长', 2, 'STATIC_RULE', 'ACTIVE', '入职2年内晋升的员工', 2, 'admin', 'admin');
-- 学历背景类（STATIC_AI）
INSERT INTO tag_definition (tag_code, tag_name, category_id, tag_source, status, description, sort_order, created_by, updated_by) VALUES
('TAG_985', '985院校', 3, 'STATIC_AI', 'ACTIVE', '毕业于985工程院校', 1, 'admin', 'admin'),
('TAG_211', '211院校', 3, 'STATIC_AI', 'ACTIVE', '毕业于211工程院校', 2, 'admin', 'admin'),
('TAG_QS100', 'QS100院校', 3, 'STATIC_AI', 'ACTIVE', '毕业于QS世界排名前100院校', 3, 'admin', 'admin'),
('TAG_DOUBLE_FIRST', '双一流', 3, 'STATIC_AI', 'ACTIVE', '毕业于双一流建设高校', 4, 'admin', 'admin');
-- 稳定性类（STATIC_AI）
INSERT INTO tag_definition (tag_code, tag_name, category_id, tag_source, status, description, sort_order, created_by, updated_by) VALUES
('TAG_HIGH_STABILITY', '稳定性强', 4, 'STATIC_AI', 'ACTIVE', '综合评估留任意愿强的员工', 1, 'admin', 'admin'),
('TAG_FLIGHT_RISK', '离职风险', 4, 'STATIC_AI', 'ACTIVE', '存在离职倾向的员工', 2, 'admin', 'admin');
-- 年龄段类（DYNAMIC）
INSERT INTO tag_definition (tag_code, tag_name, category_id, tag_source, status, description, sort_order, created_by, updated_by) VALUES
('TAG_AGE_20_25', '20-25岁', 5, 'DYNAMIC', 'ACTIVE', '年龄在20到25岁区间', 1, 'admin', 'admin'),
('TAG_AGE_26_30', '26-30岁', 5, 'DYNAMIC', 'ACTIVE', '年龄在26到30岁区间', 2, 'admin', 'admin'),
('TAG_AGE_31_35', '31-35岁', 5, 'DYNAMIC', 'ACTIVE', '年龄在31到35岁区间', 3, 'admin', 'admin'),
('TAG_AGE_36_PLUS', '36岁以上', 5, 'DYNAMIC', 'ACTIVE', '年龄在36岁及以上', 4, 'admin', 'admin');
-- 司龄段类（DYNAMIC）
INSERT INTO tag_definition (tag_code, tag_name, category_id, tag_source, status, description, sort_order, created_by, updated_by) VALUES
('TAG_TENURE_0_1', '司龄0-1年', 6, 'DYNAMIC', 'ACTIVE', '入职不满1年', 1, 'admin', 'admin'),
('TAG_TENURE_1_3', '司龄1-3年', 6, 'DYNAMIC', 'ACTIVE', '入职1到3年', 2, 'admin', 'admin'),
('TAG_TENURE_3_5', '司龄3-5年', 6, 'DYNAMIC', 'ACTIVE', '入职3到5年', 3, 'admin', 'admin'),
('TAG_TENURE_5_PLUS', '司龄5年以上', 6, 'DYNAMIC', 'ACTIVE', '入职超过5年', 4, 'admin', 'admin');

-- ========== 4. 结构化打标规则 ==========
-- 规则1：核心骨干识别（已发布）
INSERT INTO tag_rule (rule_code, rule_name, rule_type, priority, status, version_no, dsl_content, dsl_explain, published_at, published_by, remark, created_by, updated_by) VALUES
('RULE_CORE_BACKBONE', '核心骨干识别规则', 'STRUCTURED', 10, 'PUBLISHED', 1,
 '当 hire_date <= 2023-04-15（任职时长>=3年）时，输出 #{核心骨干（TAG_CORE_BACKBONE）}',
 '当员工入职日期距今>=3年时，输出标签"核心骨干"',
 NOW(), 'admin', '识别在公司服务满3年的核心员工', 'admin', 'admin');
-- 规则2：导师候选识别（已发布）
INSERT INTO tag_rule (rule_code, rule_name, rule_type, priority, status, version_no, dsl_content, dsl_explain, published_at, published_by, remark, created_by, updated_by) VALUES
('RULE_MENTOR', '导师候选识别规则', 'STRUCTURED', 20, 'PUBLISHED', 1,
 '当 grade_level >= P7 时，输出 #{导师候选（TAG_MENTOR_CANDIDATE）}',
 '当员工职级>=P7时，输出标签"导师候选"',
 NOW(), 'admin', '选拔高职级员工作为导师候选', 'admin', 'admin');
-- 规则3：年龄段分组（已发布，多分支）
INSERT INTO tag_rule (rule_code, rule_name, rule_type, priority, status, version_no, dsl_content, dsl_explain, published_at, published_by, remark, created_by, updated_by) VALUES
('RULE_AGE_GROUP', '年龄段分组规则', 'STRUCTURED', 5, 'PUBLISHED', 1,
 '多分支规则：当 age 在 20-25 时输出 #{20-25岁（TAG_AGE_20_25）}；当 age 在 26-30 时输出 #{26-30岁（TAG_AGE_26_30）}；当 age 在 31-35 时输出 #{31-35岁（TAG_AGE_31_35）}；当 age >= 36 时输出 #{36岁以上（TAG_AGE_36_PLUS）}',
 '根据员工年龄划分年龄段：20-25、26-30、31-35、36+',
 NOW(), 'admin', '动态年龄段标签分组', 'admin', 'admin');
-- 规则4：司龄段分组（草稿）
INSERT INTO tag_rule (rule_code, rule_name, rule_type, priority, status, version_no, dsl_content, dsl_explain, remark, created_by, updated_by) VALUES
('RULE_TENURE_GROUP', '司龄段分组规则', 'STRUCTURED', 5, 'UNPUBLISHED', 1,
 '多分支规则：当 tenure_years < 1 时输出 #{司龄0-1年（TAG_TENURE_0_1）}；当 tenure_years 在 1-3 时输出 #{司龄1-3年（TAG_TENURE_1_3）}；当 tenure_years 在 3-5 时输出 #{司龄3-5年（TAG_TENURE_3_5）}；当 tenure_years >= 5 时输出 #{司龄5年以上（TAG_TENURE_5_PLUS）}',
 '根据员工司龄划分司龄段：0-1年、1-3年、3-5年、5年+',
 '草稿状态，待模拟验证后发布', 'admin', 'admin');
-- 规则5：管理后备V1（已停用）
INSERT INTO tag_rule (rule_code, rule_name, rule_type, priority, status, version_no, dsl_content, dsl_explain, published_at, published_by, remark, created_by, updated_by) VALUES
('RULE_MGMT_RESERVE_V1', '管理后备识别规则V1', 'STRUCTURED', 15, 'UNPUBLISHED', 1,
 '当 grade_level >= P6 且 tenure_years >= 3 时，输出 #{管理后备（TAG_MGMT_RESERVE）}',
 '当员工职级>=P6且司龄>=3年时，输出标签"管理后备"',
 '2025-01-01 00:00:00', 'admin', '已停用，被V2版本替代', 'admin', 'admin');
-- 规则6：管理后备V2（已发布，版本链指向V1）
INSERT INTO tag_rule (rule_code, rule_name, rule_type, priority, status, version_no, origin_rule_id, dsl_content, dsl_explain, published_at, published_by, remark, created_by, updated_by) VALUES
('RULE_MGMT_RESERVE_V2', '管理后备识别规则V2', 'STRUCTURED', 15, 'PUBLISHED', 2, 5,
 '当 grade_level >= P6 且 tenure_years >= 2 且 performance 为 A 或 A+ 时，输出 #{管理后备（TAG_MGMT_RESERVE）}',
 '当员工职级>=P6、司龄>=2年且绩效为A或A+时，输出标签"管理后备"',
 NOW(), 'admin', '在V1基础上增加绩效条件，降低司龄门槛', 'admin', 'admin');

-- ========== 5. AI语义规则 ==========
-- 规则7：院校背景识别（已发布）
INSERT INTO tag_rule (rule_code, rule_name, rule_type, priority, status, version_no, dsl_content, dsl_explain, published_at, published_by, remark, created_by, updated_by) VALUES
('RULE_UNIVERSITY_AI', '院校背景智能识别', 'AI_SEMANTIC', 30, 'PUBLISHED', 1,
 '根据员工毕业院校信息，识别是否属于985、211、双一流或QS100院校',
 '通过AI语义理解，从毕业院校字段中识别院校层次标签',
 NOW(), 'admin', '基于院校名称的语义匹配', 'admin', 'admin');
-- 规则8：稳定性评估（草稿）
INSERT INTO tag_rule (rule_code, rule_name, rule_type, priority, status, version_no, dsl_content, dsl_explain, remark, created_by, updated_by) VALUES
('RULE_STABILITY_AI', '员工稳定性智能评估', 'AI_SEMANTIC', 25, 'UNPUBLISHED', 1,
 '综合分析员工简历、项目经历和任职时长，评估员工稳定性',
 '通过AI分析多维度信息，判断员工稳定性倾向',
 '草稿状态，待调优prompt后发布', 'admin', 'admin');

-- ========== 6. AI规则配置 ==========
INSERT INTO ai_rule_config (rule_id, input_fields, prompt_template, model_name, temperature, max_tokens) VALUES
(7, '["university"]',
 '请根据以下员工的毕业院校信息，判断该院校是否属于以下类别：985院校、211院校、双一流高校、QS世界排名前100院校。请从候选标签中选择匹配的标签，并给出判断依据。

毕业院校：{{university}}

候选标签：985院校、211院校、双一流、QS100院校

请以JSON格式返回：{"tags":["匹配的标签"],"explanation":"判断依据"}',
 'gpt-4o', 0.3, 2000),
(8, '["resume_text","project_experience","hire_date"]',
 '请综合分析以下员工信息，评估该员工的稳定性。考虑因素包括：工作经历连续性、项目参与深度、在职时长等。

简历：{{resume_text}}
项目经历：{{project_experience}}
入职日期：{{hire_date}}

候选标签：稳定性强、离职风险

请以JSON格式返回：{"tags":["匹配的标签"],"explanation":"评估依据","confidence":0.85}',
 'gpt-4o', 0.3, 2000);

-- ========== 7. 规则分支（年龄段规则4个分支） ==========
INSERT INTO tag_rule_branch (rule_id, branch_name, sort_order) VALUES
(3, '20-25岁', 1),
(3, '26-30岁', 2),
(3, '31-35岁', 3),
(3, '36岁以上', 4);

-- ========== 8. 规则产出标签 ==========
INSERT INTO tag_rule_output (rule_id, branch_id, tag_id) VALUES
(1, NULL, 1),   -- 核心骨干规则 -> TAG_CORE_BACKBONE
(2, NULL, 2),   -- 导师候选规则 -> TAG_MENTOR_CANDIDATE
(3, 1, 12),     -- 年龄段20-25
(3, 2, 13),     -- 年龄段26-30
(3, 3, 14),     -- 年龄段31-35
(3, 4, 15),     -- 年龄段36+
(5, NULL, 3),   -- 管理后备V1(已停用) -> TAG_MGMT_RESERVE
(6, NULL, 3),   -- 管理后备V2 -> TAG_MGMT_RESERVE
(7, NULL, 6),   -- 院校AI -> 985
(7, NULL, 7),   -- 院校AI -> 211
(7, NULL, 8),   -- 院校AI -> QS100
(7, NULL, 9);   -- 院校AI -> 双一流

-- ========== 9. 规则条件 ==========
INSERT INTO tag_rule_condition (rule_id, branch_id, group_no, logic_operator, field_code, field_name, operator, value_type, value_expr, sort_order) VALUES
(1, NULL, 1, 'AND', 'hire_date', '入职日期', 'LE', 'DATE', '2023-04-15', 1),
(2, NULL, 1, 'AND', 'grade_level', '职级', 'GE', 'STRING', 'P7', 1),
(3, 1, 1, 'AND', 'age', '年龄', 'BETWEEN', 'NUMBER', '20,25', 1),
(3, 2, 1, 'AND', 'age', '年龄', 'BETWEEN', 'NUMBER', '26,30', 1),
(3, 3, 1, 'AND', 'age', '年龄', 'BETWEEN', 'NUMBER', '31,35', 1),
(3, 4, 1, 'AND', 'age', '年龄', 'GE', 'NUMBER', '36', 1),
(6, NULL, 1, 'AND', 'grade_level', '职级', 'GE', 'STRING', 'P6', 1),
(6, NULL, 1, 'AND', 'tenure_years', '司龄(年)', 'GE', 'NUMBER', '2', 2),
(6, NULL, 1, 'AND', 'performance', '绩效等级', 'IN', 'STRING', 'A,A+', 3);

-- ========== 10. 规则适用范围 ==========
INSERT INTO tag_rule_scope (rule_id, scope_type, scope_value, scope_name, include_children, sort_order) VALUES
(1, 'ORG', '1000', '集团', TRUE, 1),
(2, 'POSITION_SEQUENCE', 'PS_TECH', '技术序列', FALSE, 1),
(3, 'ORG', '1000', '集团', TRUE, 1),
(6, 'ORG', '1000', '集团', TRUE, 1),
(7, 'ORG', '1000', '集团', TRUE, 1);

-- ========== 11. 执行任务 ==========
INSERT INTO calc_task (task_no, task_name, task_type, task_mode, task_status, submit_status, task_scope, total_count, success_count, fail_count, triggered_by, start_time, end_time) VALUES
('SIM_20260401_001', '核心骨干规则模拟验证', 'RULE', 'SIMULATION', 'SUCCESS', 'PENDING',
 '{"rules":["RULE_CORE_BACKBONE"],"scope":"全公司"}', 10, 4, 0, 'admin', '2026-04-01 10:00:00', '2026-04-01 10:00:15'),
('SIM_20260405_001', '导师候选规则模拟验证', 'RULE', 'SIMULATION', 'SUCCESS', 'PENDING',
 '{"rules":["RULE_MENTOR"],"scope":"技术序列"}', 6, 3, 0, 'admin', '2026-04-05 14:00:00', '2026-04-05 14:00:10'),
('FORMAL_20260410_001', '核心骨干正式打标', 'RULE', 'FORMAL', 'SUCCESS', 'SUBMITTED',
 '{"rules":["RULE_CORE_BACKBONE"],"scope":"全公司"}', 10, 4, 0, 'admin', '2026-04-10 09:00:00', '2026-04-10 09:00:20'),
('FORMAL_20260412_001', '导师候选正式打标', 'RULE', 'FORMAL', 'SUCCESS', 'PENDING',
 '{"rules":["RULE_MENTOR"],"scope":"技术序列"}', 6, 3, 0, 'admin', '2026-04-12 11:00:00', '2026-04-12 11:00:12'),
('FORMAL_20260415_001', '年龄段分组正式打标', 'RULE', 'FORMAL', 'INIT', 'PENDING',
 '{"rules":["RULE_AGE_GROUP"],"scope":"全公司"}', 0, 0, 0, 'admin', NULL, NULL);

-- ========== 12. 任务关联规则 ==========
INSERT INTO calc_task_rule (task_id, rule_id) VALUES
(1, 1), (2, 2), (3, 1), (4, 2), (5, 3);

-- ========== 13. 员工标签结果 ==========
-- 核心骨干（入职>=3年：张明2018、王强2016、陈磊2015、周涛2017）
INSERT INTO employee_tag_result (employee_id, tag_id, source_rule_id, task_id, hit_time, valid_flag) VALUES
(1, 1, 1, 3, '2026-04-10 09:00:10', TRUE),
(3, 1, 1, 3, '2026-04-10 09:00:12', TRUE),
(5, 1, 1, 3, '2026-04-10 09:00:14', TRUE),
(8, 1, 1, 3, '2026-04-10 09:00:16', TRUE);
-- 导师候选（职级>=P7：张明P7、王强P7、陈磊P8）
INSERT INTO employee_tag_result (employee_id, tag_id, source_rule_id, task_id, hit_time, valid_flag) VALUES
(1, 2, 2, 4, '2026-04-12 11:00:05', TRUE),
(3, 2, 2, 4, '2026-04-12 11:00:07', TRUE),
(5, 2, 2, 4, '2026-04-12 11:00:09', TRUE);

-- ========== 14. 结果证据明细 ==========
INSERT INTO employee_tag_result_detail (task_id, employee_id, rule_id, tag_id, evidence_type, scope_matched, scope_snapshot, condition_matched, condition_snapshot, final_decision) VALUES
(3, 1, 1, 1, 'STRUCTURED', TRUE, '{"scope_type":"ORG","scope_value":"1000","matched":true}', TRUE, '{"field":"hire_date","operator":"LE","value":"2023-04-15","actual":"2018-06-01","matched":true}', 'HIT'),
(3, 3, 1, 1, 'STRUCTURED', TRUE, '{"scope_type":"ORG","scope_value":"1000","matched":true}', TRUE, '{"field":"hire_date","operator":"LE","value":"2023-04-15","actual":"2016-03-01","matched":true}', 'HIT'),
(3, 5, 1, 1, 'STRUCTURED', TRUE, '{"scope_type":"ORG","scope_value":"1000","matched":true}', TRUE, '{"field":"hire_date","operator":"LE","value":"2023-04-15","actual":"2015-04-01","matched":true}', 'HIT'),
(3, 8, 1, 1, 'STRUCTURED', TRUE, '{"scope_type":"ORG","scope_value":"1000","matched":true}', TRUE, '{"field":"hire_date","operator":"LE","value":"2023-04-15","actual":"2017-11-01","matched":true}', 'HIT'),
(3, 2, 1, 1, 'STRUCTURED', TRUE, '{"scope_type":"ORG","scope_value":"1000","matched":true}', FALSE, '{"field":"hire_date","operator":"LE","value":"2023-04-15","actual":"2021-07-15","matched":false}', 'REJECTED'),
(3, 7, 1, 1, 'STRUCTURED', TRUE, '{"scope_type":"ORG","scope_value":"1000","matched":true}', FALSE, '{"field":"hire_date","operator":"LE","value":"2023-04-15","actual":"2023-07-01","matched":false}', 'REJECTED'),
(4, 1, 2, 2, 'STRUCTURED', TRUE, '{"scope_type":"POSITION_SEQUENCE","scope_value":"PS_TECH","matched":true}', TRUE, '{"field":"grade_level","operator":"GE","value":"P7","actual":"P7","matched":true}', 'HIT'),
(4, 5, 2, 2, 'STRUCTURED', TRUE, '{"scope_type":"POSITION_SEQUENCE","scope_value":"PS_TECH","matched":true}', TRUE, '{"field":"grade_level","operator":"GE","value":"P7","actual":"P8","matched":true}', 'HIT'),
(4, 2, 2, 2, 'STRUCTURED', TRUE, '{"scope_type":"POSITION_SEQUENCE","scope_value":"PS_TECH","matched":true}', FALSE, '{"field":"grade_level","operator":"GE","value":"P7","actual":"P5","matched":false}', 'REJECTED');

-- ========== 15. 操作日志 ==========
INSERT INTO operation_log (biz_type, biz_id, operation_type, operation_before, operation_after, operator_id, operator_name, operated_at) VALUES
('TAG_CATEGORY', '1', 'CREATE', NULL, '{"categoryCode":"CAT_ABILITY","categoryName":"能力素质","status":"ACTIVE"}', 'admin', '系统管理员', '2026-03-01 09:00:00'),
('TAG_CATEGORY', '2', 'CREATE', NULL, '{"categoryCode":"CAT_POTENTIAL","categoryName":"发展潜力","status":"ACTIVE"}', 'admin', '系统管理员', '2026-03-01 09:05:00'),
('TAG_DEFINITION', '1', 'CREATE', NULL, '{"tagCode":"TAG_CORE_BACKBONE","tagName":"核心骨干","tagSource":"STATIC_RULE"}', 'admin', '系统管理员', '2026-03-02 10:00:00'),
('TAG_RULE', '1', 'CREATE', NULL, '{"ruleCode":"RULE_CORE_BACKBONE","ruleName":"核心骨干识别规则","status":"UNPUBLISHED"}', 'admin', '系统管理员', '2026-03-10 14:00:00'),
('TAG_RULE', '1', 'PUBLISH', '{"status":"UNPUBLISHED"}', '{"status":"PUBLISHED"}', 'admin', '系统管理员', '2026-03-15 10:00:00'),
('TAG_RULE', '5', 'UNPUBLISH', '{"status":"PUBLISHED"}', '{"status":"UNPUBLISHED"}', 'admin', '系统管理员', '2026-04-01 09:00:00'),
('TAG_RULE', '6', 'CREATE', NULL, '{"ruleCode":"RULE_MGMT_RESERVE_V2","originRuleId":5,"status":"UNPUBLISHED"}', 'admin', '系统管理员', '2026-04-02 10:00:00'),
('TAG_RULE', '6', 'PUBLISH', '{"status":"UNPUBLISHED"}', '{"status":"PUBLISHED"}', 'admin', '系统管理员', '2026-04-05 10:00:00'),
('CALC_TASK', '3', 'RUN', '{"taskStatus":"INIT"}', '{"taskStatus":"SUCCESS","successCount":4}', 'admin', '系统管理员', '2026-04-10 09:00:00'),
('CALC_TASK', '3', 'SUBMIT', '{"submitStatus":"PENDING"}', '{"submitStatus":"SUBMITTED"}', 'admin', '系统管理员', '2026-04-10 09:30:00');

-- ========== 16. 用户角色关系 ==========
INSERT INTO sys_user_role (user_id, role_id) VALUES
('admin', 1), ('admin', 2), ('admin', 3), ('admin', 4), ('admin', 5);
