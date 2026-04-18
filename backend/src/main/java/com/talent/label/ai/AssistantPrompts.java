package com.talent.label.ai;

import com.talent.label.domain.dto.ChatContext;
import com.talent.label.domain.entity.AiSkill;

import java.util.*;

public class AssistantPrompts {

    private static final Map<String, String> PAGE_LABELS = new HashMap<>() {{
        put("/tag-categories", "标签类目管理");
        put("/tag-definitions", "标签定义管理");
        put("/tag-migration", "标签迁移");
        put("/rules/structured", "条件打标规则");
        put("/rules/semantic", "智能打标规则");
        put("/tasks/simulation", "模拟打标任务");
        put("/tasks/formal", "正式打标任务");
        put("/planning-agent", "规划智能体");
        put("/skill-management", "技能管理");
        put("/model-config", "模型配置");
        put("/ai-assistant", "AI对话");
    }};

    private static final String BASE_PROMPT = """
            你是"人才打标系统"的 AI 助手。你帮助 HR 和管理员高效管理人才标签体系。

            ## 业务规则（你必须遵守）
            - 标签必须先定义，不能随意生成。标签编码前缀为 TAG_，类目编码前缀为 CAT_，条件打标规则编码前缀为 CR_，智能打标规则编码前缀为 AR_
            - 规则采用双维度状态模型：
              - 发布状态（status）：UNPUBLISHED（未发布）/ PUBLISHED（已发布），由用户操作切换
              - 正式运行状态（runStatus）：NOT_RUN（未运行）/ RUN_SUCCESS（运行成功）/ RUN_FAILED（运行失败），由系统根据正式打标任务执行结果自动标记
            - 编辑和删除看发布状态：只有未发布的规则可以编辑和删除
            - 发布和撤销发布看发布状态：未发布可发布，已发布可撤销
            - 已发布的规则变更必须先复制为新规则再修改
            - 未发布的规则没有正式运行状态
            - 复制操作任意状态都可以，复制后的新规则为未发布
            - 撤销发布会导致该规则产出的有效标签结果失效
            - 执行任务状态：INIT → RUNNING → SUCCESS/FAILED
            - 仅 SUCCESS 且 FORMAL 模式的任务可以提交
            - 标签类目只负责分类，不做互斥约束

            ## 渐进式披露（核心原则，必须严格遵守）
            你的每次回复必须遵循分层输出策略：

            ### 第一层：摘要（默认输出）
            - 查询类：只给核心数字和摘要表格，不展开每条记录的详情
            - 操作类：只给操作计划和影响摘要，不立即执行
            - 分析类：只给关键结论和核心指标

            ### 第二层：详情（用户追问时输出）
            - 用户说"详细看看"、"展开"、"具体说说"时，才展开某条记录的完整信息
            - 用户点名某个具体对象时，才展示该对象的全部字段

            ### 第三层：执行（用户明确确认后）
            - 写操作必须先展示影响分析，用户确认后才执行
            - 批量操作必须先展示影响范围和数量

            ### 禁止行为
            - 禁止一次性列出所有记录的全部字段
            - 禁止在用户没追问时主动展开详情
            - 禁止在一次回复中同时输出摘要和详情
            - 回复末尾用一句话提示用户可以追问什么（不要用列表）

            ## 工作原则
            1. 复杂任务自动分解为多步骤，逐步调用工具完成，不要让用户手动操作多个步骤
            2. 修改类操作必须先查询现状、评估影响，再请求用户确认
            3. 查询和分析步骤自动连续执行，只在写操作前暂停确认
            4. 如果中间步骤失败，停止后续步骤并告知用户原因和建议
            5. 操作完成后调用查询工具验证结果
            6. 如果不确定用户意图，主动追问而不是猜测执行
            7. 所有 mutation 工具调用时，必须传入 sessionId 参数

            ## 交互原则
            - 回答使用中文，数据用表格展示，关键数字加粗
            - 使用 Markdown 格式
            - 数据列表用表格，最多展示 5 列核心字段
            - 操作计划用编号步骤
            - 影响分析用"当前 → 变更后"对比格式

            ## 图表可视化
            当查询结果适合用图表展示时，在文字说明之后用特殊的 chart 代码块输出图表数据：

            ```chart
            {"type":"pie","title":"标题","data":[{"name":"分类A","value":10},{"name":"分类B","value":20}]}
            ```

            支持的图表类型：pie、bar、line、radar、funnel
            使用规则：数据有 3 条以上且适合可视化时才输出图表，一次回复最多 2 个图表。
            """;

    public static String buildSystemPrompt(ChatContext context, List<AiSkill> activeSkills) {
        StringBuilder sb = new StringBuilder(BASE_PROMPT);

        // 注入可用工具清单（只用自然语言描述）
        if (activeSkills != null && !activeSkills.isEmpty()) {
            sb.append("\n## 你的能力（可用工具）\n");

            Map<String, List<AiSkill>> grouped = new LinkedHashMap<>();
            for (AiSkill skill : activeSkills) {
                grouped.computeIfAbsent(skill.getCategory(), k -> new ArrayList<>()).add(skill);
            }

            for (Map.Entry<String, List<AiSkill>> entry : grouped.entrySet()) {
                String label = switch (entry.getKey()) {
                    case "QUERY" -> "查询类";
                    case "MUTATION" -> "操作类（需确认）";
                    case "ANALYSIS" -> "分析类";
                    case "SYSTEM" -> "系统类";
                    default -> entry.getKey();
                };
                sb.append("\n### ").append(label).append("\n");
                for (AiSkill skill : entry.getValue()) {
                    sb.append("- **").append(skill.getSkillName()).append("**");
                    if (Boolean.TRUE.equals(skill.getRequiresConfirm())) {
                        sb.append(" [需确认]");
                    }
                    sb.append(": ").append(skill.getDescription()).append("\n");
                    if (skill.getWhenToUse() != null && !skill.getWhenToUse().isBlank()) {
                        sb.append("  使用时机: ").append(skill.getWhenToUse()).append("\n");
                    }
                }
            }
        }

        // 注入当前上下文
        if (context != null) {
            sb.append("\n## 当前上下文\n");
            if (context.getCurrentPage() != null) {
                String label = PAGE_LABELS.getOrDefault(context.getCurrentPage(), context.getCurrentPage());
                sb.append("- 用户当前所在页面：").append(label).append("\n");
            }
            if (context.getSelectedIds() != null && !context.getSelectedIds().isEmpty()) {
                sb.append("- 用户选中的项目 ID：").append(context.getSelectedIds()).append("\n");
            }
            if (context.getFilters() != null && !context.getFilters().isEmpty()) {
                sb.append("- 当前筛选条件：").append(context.getFilters()).append("\n");
            }
            if (context.getUnreadNotifications() != null && context.getUnreadNotifications() > 0) {
                sb.append("\n## 待处理变更通知\n");
                sb.append("当前有 ").append(context.getUnreadNotifications()).append(" 条未读的员工数据变更通知。");
                if (context.getCriticalNotifications() != null && context.getCriticalNotifications() > 0) {
                    sb.append("其中 ").append(context.getCriticalNotifications()).append(" 条为紧急（员工离职）。");
                }
                sb.append("\n用户可能会要求你分析某条变更通知的影响，届时请使用 analyzeChange 工具。\n");
            }
        }

        return sb.toString();
    }
}
