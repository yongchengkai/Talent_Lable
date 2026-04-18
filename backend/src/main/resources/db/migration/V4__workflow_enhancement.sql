-- V4: 升级 workflow_steps 为可编排格式，增加 skill_to_call 引导 LLM 自动串联多步操作

-- update_tag_rule: 修改规则的完整工作流
UPDATE ai_skill SET workflow_steps = '[
  {"step":1,"name":"locate","type":"api_call","skill_to_call":"query_tag_rules","description":"搜索定位目标规则"},
  {"step":2,"name":"check_status","type":"condition","condition":"如果 status=PUBLISHED 或 runStatus=HAS_RUN，需先复制为新草稿","description":"检查规则状态是否允许直接编辑"},
  {"step":3,"name":"copy_if_needed","type":"api_call","skill_to_call":"copy_tag_rule","description":"已发布/已运行的规则需先复制为新草稿"},
  {"step":4,"name":"generate_dsl","type":"api_call","skill_to_call":"generate_dsl","description":"根据用户描述生成新的 DSL"},
  {"step":5,"name":"impact","type":"api_call","skill_to_call":"get_rule_impact","description":"评估修改后的影响范围"},
  {"step":6,"name":"confirm","type":"user_confirm","description":"展示完整修改计划（当前→变更后）和影响分析，等待用户确认"},
  {"step":7,"name":"execute","type":"api_call","skill_to_call":"update_tag_rule","description":"执行修改"},
  {"step":8,"name":"verify","type":"api_call","skill_to_call":"query_tag_rules","description":"查询验证修改结果"}
]' WHERE skill_code = 'update_tag_rule';

-- create_tag_rule: 创建规则的完整工作流
UPDATE ai_skill SET workflow_steps = '[
  {"step":1,"name":"collect_info","type":"gather_params","description":"收集规则信息：名称、类型、目标标签、规则逻辑"},
  {"step":2,"name":"generate_dsl","type":"api_call","skill_to_call":"generate_dsl","description":"根据自然语言描述生成 DSL"},
  {"step":3,"name":"confirm","type":"user_confirm","description":"展示创建计划（含 DSL 预览），等待确认"},
  {"step":4,"name":"execute","type":"api_call","skill_to_call":"create_tag_rule","description":"创建规则（初始状态为草稿）"},
  {"step":5,"name":"suggest_next","type":"format_output","description":"创建成功后建议：可发布规则或先做模拟打标验证"}
]' WHERE skill_code = 'create_tag_rule';

-- publish_tag_rule: 发布规则的完整工作流
UPDATE ai_skill SET workflow_steps = '[
  {"step":1,"name":"locate","type":"api_call","skill_to_call":"query_tag_rules","description":"定位目标规则，确认状态为草稿"},
  {"step":2,"name":"check","type":"condition","condition":"仅 UNPUBLISHED 状态可发布；建议先做模拟打标","description":"检查发布条件"},
  {"step":3,"name":"impact","type":"api_call","skill_to_call":"get_rule_impact","description":"评估发布后的影响范围"},
  {"step":4,"name":"confirm","type":"user_confirm","description":"展示发布影响，提醒发布后规则冻结不可直接修改"},
  {"step":5,"name":"execute","type":"api_call","skill_to_call":"publish_tag_rule","description":"执行发布"},
  {"step":6,"name":"verify","type":"api_call","skill_to_call":"query_tag_rules","description":"验证发布结果"}
]' WHERE skill_code = 'publish_tag_rule';

-- stop_tag_rule: 停用规则的完整工作流
UPDATE ai_skill SET workflow_steps = '[
  {"step":1,"name":"locate","type":"api_call","skill_to_call":"query_tag_rules","description":"定位目标规则，确认状态为已发布"},
  {"step":2,"name":"impact","type":"api_call","skill_to_call":"get_rule_impact","description":"分析停用影响：该规则产出的标签结果将失效"},
  {"step":3,"name":"confirm","type":"user_confirm","description":"展示影响分析，提醒停用后标签结果失效"},
  {"step":4,"name":"execute","type":"api_call","skill_to_call":"stop_tag_rule","description":"执行停用"},
  {"step":5,"name":"verify","type":"api_call","skill_to_call":"query_tag_rules","description":"验证停用结果"}
]' WHERE skill_code = 'stop_tag_rule';

-- copy_tag_rule: 复制规则的工作流
UPDATE ai_skill SET workflow_steps = '[
  {"step":1,"name":"locate","type":"api_call","skill_to_call":"query_tag_rules","description":"定位目标规则"},
  {"step":2,"name":"confirm","type":"user_confirm","description":"说明复制后生成新草稿版本，等待确认"},
  {"step":3,"name":"execute","type":"api_call","skill_to_call":"copy_tag_rule","description":"执行复制"},
  {"step":4,"name":"present","type":"format_output","description":"展示新规则信息，建议后续可编辑或发布"}
]' WHERE skill_code = 'copy_tag_rule';

-- run_calc_task: 执行任务的工作流
UPDATE ai_skill SET workflow_steps = '[
  {"step":1,"name":"locate","type":"api_call","skill_to_call":"query_calc_tasks","description":"定位目标任务，确认状态为 INIT 或 FAILED"},
  {"step":2,"name":"confirm","type":"user_confirm","description":"展示任务信息和关联规则，等待确认执行"},
  {"step":3,"name":"execute","type":"api_call","skill_to_call":"run_calc_task","description":"执行打标任务"},
  {"step":4,"name":"suggest_next","type":"format_output","description":"执行成功后建议：如果是正式任务可提交结果"}
]' WHERE skill_code = 'run_calc_task';

-- submit_calc_task: 提交任务的工作流
UPDATE ai_skill SET workflow_steps = '[
  {"step":1,"name":"locate","type":"api_call","skill_to_call":"query_calc_tasks","description":"定位目标任务，确认 SUCCESS + FORMAL + PENDING"},
  {"step":2,"name":"confirm","type":"user_confirm","description":"展示执行结果摘要，提醒提交后不可撤销"},
  {"step":3,"name":"execute","type":"api_call","skill_to_call":"submit_calc_task","description":"提交结果入库"},
  {"step":4,"name":"verify","type":"api_call","skill_to_call":"query_calc_tasks","description":"验证提交状态"}
]' WHERE skill_code = 'submit_calc_task';

-- query_tag_rules: 查询规则增加后续操作提示
UPDATE ai_skill SET workflow_steps = '[
  {"step":1,"name":"parse_intent","type":"gather_params","description":"理解查询意图，提取关键词、状态、类型等条件"},
  {"step":2,"name":"query","type":"api_call","skill_to_call":"query_tag_rules","description":"调用API获取规则列表"},
  {"step":3,"name":"present","type":"format_output","description":"格式化展示结果"},
  {"step":4,"name":"suggest","type":"format_output","description":"如用户想修改规则，可调用 update_tag_rule；想发布可调用 publish_tag_rule；想分析影响可调用 get_rule_impact"}
]' WHERE skill_code = 'query_tag_rules';

-- get_rule_impact: 影响分析增加后续操作提示
UPDATE ai_skill SET workflow_steps = '[
  {"step":1,"name":"identify_rule","type":"gather_params","description":"确定目标规则 ID"},
  {"step":2,"name":"analyze","type":"api_call","skill_to_call":"get_rule_impact","description":"获取影响数据"},
  {"step":3,"name":"present","type":"format_output","description":"展示影响分析，如影响范围大主动提醒谨慎操作"},
  {"step":4,"name":"suggest","type":"format_output","description":"可继续调用 update_tag_rule 修改规则，或 stop_tag_rule 停用规则"}
]' WHERE skill_code = 'get_rule_impact';
