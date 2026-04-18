-- V8: 更新已有规则的 DSL 内容，将旧 JSON 格式改为自然语言 + #{标签名称（标签编码）} 格式

UPDATE tag_rule SET dsl_content = '当 hire_date <= 2023-04-15（任职时长>=3年）时，输出 #{核心骨干（TAG_CORE_BACKBONE）}'
WHERE rule_code = 'RULE_CORE_BACKBONE';

UPDATE tag_rule SET dsl_content = '当 grade_level >= P7 时，输出 #{导师候选（TAG_MENTOR_CANDIDATE）}'
WHERE rule_code = 'RULE_MENTOR';

UPDATE tag_rule SET dsl_content = '多分支规则：当 age 在 20-25 时输出 #{20-25岁（TAG_AGE_20_25）}；当 age 在 26-30 时输出 #{26-30岁（TAG_AGE_26_30）}；当 age 在 31-35 时输出 #{31-35岁（TAG_AGE_31_35）}；当 age >= 36 时输出 #{36岁以上（TAG_AGE_36_PLUS）}'
WHERE rule_code = 'RULE_AGE_GROUP';

UPDATE tag_rule SET dsl_content = '多分支规则：当 tenure_years < 1 时输出 #{司龄0-1年（TAG_TENURE_0_1）}；当 tenure_years 在 1-3 时输出 #{司龄1-3年（TAG_TENURE_1_3）}；当 tenure_years 在 3-5 时输出 #{司龄3-5年（TAG_TENURE_3_5）}；当 tenure_years >= 5 时输出 #{司龄5年以上（TAG_TENURE_5_PLUS）}'
WHERE rule_code = 'RULE_TENURE_GROUP';

UPDATE tag_rule SET dsl_content = '当 grade_level >= P6 且 tenure_years >= 3 时，输出 #{管理后备（TAG_MGMT_RESERVE）}'
WHERE rule_code = 'RULE_MGMT_RESERVE_V1';

UPDATE tag_rule SET dsl_content = '当 grade_level >= P6 且 tenure_years >= 2 且 performance 为 A 或 A+ 时，输出 #{管理后备（TAG_MGMT_RESERVE）}'
WHERE rule_code = 'RULE_MGMT_RESERVE_V2';
