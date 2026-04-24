import { useEffect, useState } from 'react';
import { Button, Table, Space, Modal, Form, Input, Select, Tag, message, Popconfirm } from 'antd';
import { PlusOutlined, SearchOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { ruleApi, aiApi } from '@/services/api';
import ActionLink from '@/components/ActionLink';
import DslEditor, { parseTagRefs } from '@/components/DslEditor';

const { Option } = Select;

/** 从 JSON DSL 的 outputs 中提取标签 */
const extractOutputTags = (dsl: string): { tagName: string; tagCode: string }[] => {
  try {
    const parsed = JSON.parse(dsl);
    const outputs: string[] = [];
    if (Array.isArray(parsed.outputs)) {
      outputs.push(...parsed.outputs);
    }
    const isMultiBranch = parsed.type === 'MULTI_BRANCH' || (Array.isArray(parsed.branches) && parsed.branches.length > 0);
    if (isMultiBranch && Array.isArray(parsed.branches)) {
      for (const branch of parsed.branches) {
        if (Array.isArray(branch?.outputs)) outputs.push(...branch.outputs);
      }
    }
    if (outputs.length === 0) return [];
    const result: { tagName: string; tagCode: string }[] = [];
    const seen = new Set<string>();
    for (const o of outputs) {
      const m = o.match(/^#\{(.+?)（([A-Z0-9_]+)）\}$/);
      if (m && !seen.has(m[2])) {
        seen.add(m[2]);
        result.push({ tagName: m[1], tagCode: m[2] });
      }
    }
    return result;
  } catch {
    return parseTagRefs(dsl || '');
  }
};

export default function RuleStructuredPage({ embedded, embeddedFilters, embeddedPrefill, embeddedAction, onNavigate }: { embedded?: boolean; embeddedFilters?: Record<string, string>; embeddedPrefill?: Record<string, any>; embeddedAction?: string; onNavigate?: (page: string, filters?: Record<string, string>) => void } = {}) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState(embeddedFilters?.keyword || '');
  const [filterStatus, setFilterStatus] = useState<string | undefined>(embeddedFilters?.status);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form] = Form.useForm();
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRecord, setDetailRecord] = useState<any>(null);
  const [dslContent, setDslContent] = useState('');

  const fetchData = async (page = current, size = pageSize) => {
    setLoading(true);
    try {
      const res: any = await ruleApi.page({ current: page, size, keyword, status: filterStatus, ruleType: 'STRUCTURED' });
      setData(res.data.records);
      setTotal(res.data.total);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(1); }, []);

  useEffect(() => {
    if (embedded && embeddedAction === 'create') {
      setCreateDone(false);
      const prefill = embeddedPrefill || {};
      const prefillDsl = prefill.dslContent || prefill.dsl || '';
      setEditingId(null); form.resetFields(); setAiResult(''); setDslContent('');
      form.setFieldsValue({ ruleCode: 'CR_', ...prefill, ...(prefillDsl ? { dslContent: prefillDsl } : {}) });
      if (prefillDsl) setDslContent(prefillDsl);
      setAiInput(prefill.prompt ? String(prefill.prompt) : '');
    } else if (embedded && embeddedAction === 'edit') {
      setEditDone(false);
      const prefill = embeddedPrefill || {};
      const id = prefill.id !== undefined ? Number(prefill.id) : null;
      setEditingId(id && !Number.isNaN(id) ? id : null);
      form.resetFields(); setAiResult('');
      const applyValues = (source: any) => {
        const sourceDsl = source.dslContent || source.dsl || '';
        form.setFieldsValue({ ...source, ...(sourceDsl ? { dslContent: sourceDsl } : {}) });
        setDslContent(sourceDsl || '');
        setAiInput(source.prompt ? String(source.prompt) : '');
      };
      const doFill = async () => {
        if (id && !Number.isNaN(id)) {
          try {
            const res: any = await ruleApi.getById(id);
            applyValues(res.data || {});
            return;
          } catch {}
        }
        applyValues(prefill);
      };
      doFill();
    }
  }, [embedded, embeddedAction, embeddedPrefill]);
  const openCreate = () => {
    setEditingId(null); form.resetFields(); setAiResult(''); setDslContent('');
    form.setFieldsValue({ ruleCode: 'CR_' });
    setModalOpen(true);
  };

  const openEdit = async (record: any) => {
    // 检查是否被正式任务运行成功或运行中
    try {
      const res: any = await ruleApi.getFormalTasks(record.id);
      const tasks = res.data || [];
      const blocked = tasks.filter((t: any) => t.taskStatus === 'RUNNING' || t.taskStatus === 'SUCCESS');
      if (blocked.length > 0) {
        Modal.info({
          title: '无法编辑',
          icon: <ExclamationCircleOutlined style={{ color: '#0ea5e9' }} />,
          content: `规则「${record.ruleName}」已被 ${blocked.length} 个正式打标任务使用（运行中或已成功），不可编辑。请先撤销相关任务后再编辑。`,
          okText: '知道了',
        });
        return;
      }
    } catch {}
    setEditingId(record.id); form.setFieldsValue(record); setAiResult('');
    setDslContent(record.dslContent || '');
    setModalOpen(true);
  };

  const openCopy = (record: any) => {
    setEditingId(null);
    form.resetFields();
    form.setFieldsValue({
      ruleCode: 'CR_',
      ruleName: record.ruleName + ' (副本)',
      dslExplain: record.dslExplain,
    });
    setDslContent(record.dslContent || '');
    setAiResult('');
    setModalOpen(true);
  };

  const openDetail = (record: any) => {
    setDetailRecord(record);
    setDetailOpen(true);
  };

  const handleAiGenerate = async () => {
    if (!aiInput.trim()) return;
    setAiLoading(true);
    try {
      const res: any = await aiApi.generateDsl({ naturalLanguage: aiInput });
      const generated = res.data;
      setAiResult(typeof generated === 'string' ? generated : JSON.stringify(generated, null, 2));
      setDslContent(typeof generated === 'string' ? generated : JSON.stringify(generated, null, 2));
    } catch (e: any) { message.error('AI 生成失败: ' + e.message); }
    finally { setAiLoading(false); }
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    if (!dslContent.trim()) {
      message.warning('请输入规则 DSL');
      return;
    }
    // 校验 JSON 格式
    try {
      const parsed = JSON.parse(dslContent);
      const isMultiBranch = parsed.type === 'MULTI_BRANCH' || (Array.isArray(parsed.branches) && parsed.branches.length > 0);

      if (isMultiBranch) {
        if (!Array.isArray(parsed.branches) || parsed.branches.length === 0) {
          message.warning('DSL 缺少 branches 字段');
          return;
        }
        for (let i = 0; i < parsed.branches.length; i++) {
          const branch = parsed.branches[i];
          if (!Array.isArray(branch?.conditions) || branch.conditions.length === 0) {
            message.warning(`DSL 第 ${i + 1} 个分支缺少 conditions 字段`);
            return;
          }
          if (!Array.isArray(branch?.outputs) || branch.outputs.length === 0) {
            message.warning(`DSL 第 ${i + 1} 个分支缺少 outputs 字段`);
            return;
          }
        }
      } else {
        if (!Array.isArray(parsed.conditions) || parsed.conditions.length === 0) {
          message.warning('DSL 缺少 conditions 字段');
          return;
        }
        if (!Array.isArray(parsed.outputs) || parsed.outputs.length === 0) {
          message.warning('DSL 缺少 outputs 字段');
          return;
        }
      }
    } catch {
      message.error('DSL 不是合法的 JSON 格式');
      return;
    }
    const payload = { ...values, dslContent, ruleType: 'STRUCTURED', createdBy: 'admin', updatedBy: 'admin' };
    if (editingId) {
      await ruleApi.update(editingId, payload); message.success('更新成功');
    } else {
      await ruleApi.create(payload); message.success('创建成功');
    }
    setModalOpen(false);
    fetchData();
  };

  const handlePublish = async (record: any) => {
    try { await ruleApi.publish(record.id); message.success('发布成功'); fetchData(); }
    catch (e: any) { message.error(e.message || '发布失败'); }
  };

  const handleUnpublish = async (record: any) => {
    try { await ruleApi.stop(record.id); message.success('已撤销'); fetchData(); }
    catch (e: any) { message.error(e.message || '撤销失败'); }
  };

  const publishStatusMap: Record<string, { text: string; color: string }> = {
    UNPUBLISHED: { text: '未发布', color: 'default' }, PUBLISHED: { text: '已发布', color: 'green' },
  };
  const runStatusMap: Record<string, { text: string; color: string }> = {
    NOT_RUN: { text: '未运行', color: 'default' }, RUN_SUCCESS: { text: '运行成功', color: 'green' }, RUN_FAILED: { text: '运行失败', color: 'red' },
  };

  const columns = [
    { title: '规则名称', dataIndex: 'ruleName', width: 180, render: (name: string, record: any) => embedded ? <span style={{ fontWeight: 500 }}>{name}</span> : <a className="action-link" style={{ fontWeight: 500 }} onClick={() => openDetail(record)}>{name}</a> },
    { title: '规则编码', dataIndex: 'ruleCode', width: 160 },
    { title: '规则描述', dataIndex: 'dslExplain', ellipsis: true, width: 200 },
    { title: '输出标签', dataIndex: 'dslContent', width: 180, render: (dsl: string) => {
      const tags = extractOutputTags(dsl || '');
      if (tags.length === 0) return <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>;
      return (
        <span style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {tags.slice(0, 3).map(t => <Tag key={t.tagCode} color="cyan" style={{ margin: 0, fontSize: 11 }}>{t.tagName}</Tag>)}
          {tags.length > 3 && <Tag style={{ margin: 0, fontSize: 11 }}>+{tags.length - 3}</Tag>}
        </span>
      );
    }},
    { title: '发布状态', dataIndex: 'status', width: 90, render: (s: string) => <Tag color={publishStatusMap[s]?.color}>{publishStatusMap[s]?.text}</Tag> },
    { title: '关联正式任务数', dataIndex: 'id', width: 120, render: (_: any, record: any) => <FormalTaskCountCell ruleId={record.id} /> },
    ...(!embedded ? [{
      title: '操作', width: 280,
      render: (_: any, record: any) => (
        <Space>
          <ActionLink
            onClick={() => openEdit(record)}>
            编辑
          </ActionLink>
          <ActionLink success
            disabled={record.status === 'PUBLISHED'}
            disabledReason="规则已发布"
            onClick={() => handlePublish(record)}>
            发布
          </ActionLink>
          <ActionLink danger
            disabled={record.status !== 'PUBLISHED'}
            disabledReason="仅已发布的规则可撤销"
            onClick={() => handleUnpublish(record)}>
            撤销
          </ActionLink>
          <ActionLink onClick={() => openCopy(record)}>复制</ActionLink>
          <ActionLink danger
            onClick={() => {
              Modal.confirm({ title: '确认删除', icon: <ExclamationCircleOutlined style={{ color: '#0ea5e9' }} />, content: '删除后不可恢复，确认删除该规则？', okText: '确认删除', cancelText: '取消', okButtonProps: { danger: true }, onOk: async () => { try { await ruleApi.delete(record.id); message.success('删除成功'); fetchData(); } catch (e: any) { message.error(e.message || '删除失败'); } } });
            }}>
            删除
          </ActionLink>
        </Space>
      ),
    }] : []),
  ];

  const [createDone, setCreateDone] = useState(false);
  const [editDone, setEditDone] = useState(false);

  const isEmbeddedCreate = embedded && embeddedAction === 'create';
  const isEmbeddedEdit = embedded && embeddedAction === 'edit';

  if (isEmbeddedCreate) {
    if (createDone) {
      return (
        <div style={{ background: 'rgba(16,185,129,0.08)', borderRadius: 8, border: '1px solid rgba(16,185,129,0.2)', padding: '12px 16px', margin: '8px 0' }}>
          <span style={{ color: '#10b981', fontWeight: 500, fontSize: 13 }}>✓ 条件打标规则创建成功</span>
        </div>
      );
    }
    return (
      <div style={{ width: '100%', maxWidth: '100%', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden', margin: '8px 0' }}>
        <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>新建条件打标规则</span>
        </div>
        <div style={{ padding: '12px 16px' }}>
          {/* 基本信息 */}
          <Form form={form} layout="vertical" size="small">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
              <Form.Item name="ruleCode" label={<span style={{ fontSize: 12 }}>规则编码</span>} rules={[{ required: true }]}>
                <Input placeholder="CR_" style={{ fontSize: 12 }} />
              </Form.Item>
              <Form.Item name="ruleName" label={<span style={{ fontSize: 12 }}>规则名称</span>} rules={[{ required: true }]}>
                <Input style={{ fontSize: 12 }} />
              </Form.Item>
            </div>
            <Form.Item label={<span style={{ fontSize: 12 }}>规则 DSL（JSON 格式）</span>}>
              <DslEditor value={dslContent} onChange={v => { setDslContent(v); form.setFieldsValue({ dslContent: v }); }} rows={8} showFieldActions={false} />
            </Form.Item>
            <Form.Item name="dslExplain" label={<span style={{ fontSize: 12 }}>规则解释</span>}>
              <Input.TextArea rows={2} placeholder="用自然语言描述这条规则的业务含义" style={{ fontSize: 12 }} />
            </Form.Item>
          </Form>

          {/* AI 对话生成 DSL（上下布局） */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12, marginTop: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'linear-gradient(135deg, #0ea5e9, #8b5cf6)', display: 'inline-block', boxShadow: '0 0 6px rgba(14, 165, 233, 0.4)' }} />
              <span style={{ fontWeight: 600, fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>AI 对话生成 DSL</span>
            </div>
            <Input.TextArea rows={3} placeholder="用自然语言描述规则，如：职级>=P7 且司龄>3年，输出核心骨干标签" value={aiInput} onChange={(e) => setAiInput(e.target.value)} style={{ fontSize: 12 }} />
            <Button type="primary" size="small" style={{ marginTop: 8, background: 'linear-gradient(135deg, #0ea5e9, #8b5cf6)', border: 'none', fontSize: 12 }} loading={aiLoading} onClick={handleAiGenerate}>生成 DSL</Button>
            {aiResult && (
              <div style={{ marginTop: 8, padding: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 8, whiteSpace: 'pre-wrap', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, maxHeight: 200, overflow: 'auto', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, position: 'relative' }}>
                <div style={{ position: 'absolute', top: 6, right: 8, fontSize: 9, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>AI Generated</div>
                {aiResult}
              </div>
            )}
          </div>

          <div style={{ textAlign: 'right', marginTop: 12 }}>
            <Button type="primary" size="small" style={{ fontSize: 12 }} onClick={async () => {
              try {
                const values = await form.validateFields();
                if (!dslContent.trim()) { message.warning('请输入规则 DSL'); return; }
                await ruleApi.create({ ...values, dslContent, ruleType: 'STRUCTURED', createdBy: 'admin', updatedBy: 'admin' });
                message.success('规则创建成功');
                setCreateDone(true);
              } catch (e: any) {
                if (e.message) message.error(e.message);
              }
            }}>创建</Button>
          </div>
        </div>
      </div>
    );
  }

  if (isEmbeddedEdit) {
    if (!editingId) {
      return (
        <div style={{ background: 'rgba(239,68,68,0.08)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)', padding: '12px 16px', margin: '8px 0' }}>
          <span style={{ color: '#ef4444', fontWeight: 500, fontSize: 13 }}>缺少规则 ID，无法编辑</span>
        </div>
      );
    }
    if (editDone) {
      return (
        <div style={{ background: 'rgba(16,185,129,0.08)', borderRadius: 8, border: '1px solid rgba(16,185,129,0.2)', padding: '12px 16px', margin: '8px 0' }}>
          <span style={{ color: '#10b981', fontWeight: 500, fontSize: 13 }}>✓ 条件打标规则更新成功</span>
        </div>
      );
    }
    return (
      <div style={{ width: '100%', maxWidth: '100%', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden', margin: '8px 0' }}>
        <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>编辑条件打标规则</span>
        </div>
        <div style={{ padding: '12px 16px' }}>
          <Form form={form} layout="vertical" size="small">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
              <Form.Item name="ruleCode" label={<span style={{ fontSize: 12 }}>规则编码</span>} rules={[{ required: true }]}>
                <Input disabled style={{ fontSize: 12 }} />
              </Form.Item>
              <Form.Item name="ruleName" label={<span style={{ fontSize: 12 }}>规则名称</span>} rules={[{ required: true }]}>
                <Input style={{ fontSize: 12 }} />
              </Form.Item>
            </div>
            <Form.Item label={<span style={{ fontSize: 12 }}>规则 DSL（JSON 格式）</span>}>
              <DslEditor value={dslContent} onChange={v => { setDslContent(v); form.setFieldsValue({ dslContent: v }); }} rows={8} showFieldActions={false} />
            </Form.Item>
            <Form.Item name="dslExplain" label={<span style={{ fontSize: 12 }}>规则解释</span>}>
              <Input.TextArea rows={2} placeholder="用自然语言描述这条规则的业务含义" style={{ fontSize: 12 }} />
            </Form.Item>
          </Form>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12, marginTop: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'linear-gradient(135deg, #0ea5e9, #8b5cf6)', display: 'inline-block', boxShadow: '0 0 6px rgba(14, 165, 233, 0.4)' }} />
              <span style={{ fontWeight: 600, fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>AI 对话生成 DSL</span>
            </div>
            <Input.TextArea rows={3} placeholder="用自然语言描述规则，如：职级>=P7 且司龄>3年，输出核心骨干标签" value={aiInput} onChange={(e) => setAiInput(e.target.value)} style={{ fontSize: 12 }} />
            <Button type="primary" size="small" style={{ marginTop: 8, background: 'linear-gradient(135deg, #0ea5e9, #8b5cf6)', border: 'none', fontSize: 12 }} loading={aiLoading} onClick={handleAiGenerate}>生成 DSL</Button>
            {aiResult && (
              <div style={{ marginTop: 8, padding: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 8, whiteSpace: 'pre-wrap', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, maxHeight: 200, overflow: 'auto', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, position: 'relative' }}>
                <div style={{ position: 'absolute', top: 6, right: 8, fontSize: 9, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>AI Generated</div>
                {aiResult}
              </div>
            )}
          </div>

          <div style={{ textAlign: 'right', marginTop: 12 }}>
            <Button type="primary" size="small" style={{ fontSize: 12 }} onClick={async () => {
              try {
                const values = await form.validateFields();
                if (!dslContent.trim()) { message.warning('请输入规则 DSL'); return; }
                await ruleApi.update(editingId, { ...values, dslContent, ruleType: 'STRUCTURED', updatedBy: 'admin' });
                message.success('规则更新成功');
                setEditDone(true);
              } catch (e: any) {
                if (e.message) message.error(e.message);
              }
            }}>保存</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={embedded ? undefined : "page-container"} style={embedded ? { width: '100%', maxWidth: '100%', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden', margin: '8px 0' } : undefined}>
      <div className={embedded ? undefined : "page-toolbar"} style={embedded ? { padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.04)' } : undefined}>
        <Space size={embedded ? 6 : 8} wrap={embedded}>
          <Input placeholder="搜索规则名称、编码" value={keyword} onChange={(e) => setKeyword(e.target.value)} onPressEnter={() => fetchData(1)} prefix={<SearchOutlined />} size={embedded ? 'small' : 'middle'} style={{ width: embedded ? 180 : 240, fontSize: embedded ? 12 : undefined }} />
          <Select placeholder="发布状态" allowClear size={embedded ? 'small' : 'middle'} style={{ width: embedded ? 90 : 120, fontSize: embedded ? 12 : undefined }} value={filterStatus} onChange={v => { setFilterStatus(v); }}>
            <Option value="UNPUBLISHED">未发布</Option><Option value="PUBLISHED">已发布</Option>
          </Select>
          <Button size={embedded ? 'small' : 'middle'} onClick={() => fetchData(1)} style={embedded ? { fontSize: 12 } : undefined}>查询</Button>
        </Space>
        {!embedded && <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新建</Button>}
      </div>

      <Table rowKey="id" columns={columns} dataSource={data} loading={loading}
        size={embedded ? 'small' : undefined}
        scroll={embedded ? { x: 900 } : undefined}
        style={embedded ? { fontSize: 12 } : undefined}
        pagination={{ current, total, pageSize: embedded ? 10 : pageSize, showTotal: (t) => `共 ${t} 条`, showSizeChanger: true, showQuickJumper: !embedded, pageSizeOptions: embedded ? ['5', '10', '20'] : ['10', '20', '50', '100'], size: embedded ? 'small' : undefined, onChange: (p, s) => { setCurrent(p); setPageSize(s); fetchData(p, s); } }} />

      {embedded && (
        <div style={{ padding: '4px 12px', borderTop: '1px solid rgba(255,255,255,0.04)', textAlign: 'right' }}>
          <Button type="link" size="small" style={{ fontSize: 12, padding: 0 }} onClick={() => onNavigate?.('/app/rules/structured')}>
            在页面中查看 →
          </Button>
        </div>
      )}

      {/* 详情弹窗 */}
      <Modal title="规则详情" open={detailOpen} onCancel={() => setDetailOpen(false)} maskClosable={false} footer={
        <Space>
          {detailRecord?.status !== 'PUBLISHED' && <Button onClick={() => { setDetailOpen(false); openEdit(detailRecord); }}>编辑</Button>}
          <Button onClick={() => setDetailOpen(false)}>关闭</Button>
        </Space>
      } width={700} destroyOnClose>
        {detailRecord && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}>
            <div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>规则名称</div>
              <div style={{ fontWeight: 600, color: 'rgba(255,255,255,0.92)' }}>{detailRecord.ruleName}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>规则编码</div>
              <div style={{ fontWeight: 600, color: 'rgba(255,255,255,0.92)', fontFamily: "'JetBrains Mono', monospace" }}>{detailRecord.ruleCode}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>发布状态</div>
              <Tag color={publishStatusMap[detailRecord.status]?.color}>{publishStatusMap[detailRecord.status]?.text}</Tag>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>正式运行状态</div>
              {detailRecord.status === 'PUBLISHED' || detailRecord.runStatus
                ? <Tag color={runStatusMap[detailRecord.runStatus]?.color}>{runStatusMap[detailRecord.runStatus]?.text || '-'}</Tag>
                : <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>}
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>规则 DSL</div>
              <pre style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 8, fontSize: 13, fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'pre-wrap', maxHeight: 300, overflow: 'auto', border: '1px solid rgba(255,255,255,0.06)' }}>{detailRecord.dslContent || '-'}</pre>
              {(() => {
                const tags = extractOutputTags(detailRecord.dslContent || '');
                return tags.length > 0 ? (
                  <div style={{ marginTop: 6, fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
                    输出标签 ({tags.length})：{tags.map(t => <Tag key={t.tagCode} color="cyan" style={{ margin: '0 4px 0 0', fontSize: 11 }}>{t.tagName}</Tag>)}
                  </div>
                ) : null;
              })()}
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>规则解释</div>
              <div style={{ color: 'rgba(255,255,255,0.92)' }}>{detailRecord.dslExplain || '-'}</div>
            </div>
          </div>
        )}
      </Modal>

      {/* 编辑弹窗 */}
      <Modal title={editingId ? '编辑规则' : '新建规则'} open={modalOpen} onOk={handleSave} onCancel={() => setModalOpen(false)} width={720} maskClosable={false} destroyOnClose>
        <Form form={form} layout="vertical">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="ruleCode" label="规则编码" rules={[{ required: true }]}>
              <Input disabled={!!editingId} placeholder="CR_" />
            </Form.Item>
            <Form.Item name="ruleName" label="规则名称" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </div>

          {/* AI 对话生成 DSL */}
          <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)', padding: 16, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'linear-gradient(135deg, #0ea5e9, #8b5cf6)', display: 'inline-block', boxShadow: '0 0 8px rgba(14, 165, 233, 0.4)' }} />
              <span style={{ fontWeight: 700, fontSize: 14, color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.02em' }}>AI 对话生成 DSL</span>
            </div>
            <Input.TextArea rows={3} placeholder="用自然语言描述规则，如：职级>=P7 且司龄>3年，输出核心骨干标签" value={aiInput} onChange={(e) => setAiInput(e.target.value)} />
            <Button type="primary" style={{ marginTop: 10, background: 'linear-gradient(135deg, #0ea5e9, #8b5cf6)', border: 'none', boxShadow: '0 2px 10px rgba(14, 165, 233, 0.2)' }} loading={aiLoading} onClick={handleAiGenerate}>生成 DSL</Button>
            {aiResult && (
              <div style={{ marginTop: 12, padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 8, whiteSpace: 'pre-wrap', fontFamily: "'JetBrains Mono', monospace", fontSize: 12, maxHeight: 200, overflow: 'auto', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, position: 'relative' }}>
                <div style={{ position: 'absolute', top: 6, right: 8, fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>AI Generated</div>
                {aiResult}
              </div>
            )}
          </div>

          <Form.Item label="规则 DSL（JSON 格式）">
            <DslEditor value={dslContent} onChange={v => { setDslContent(v); form.setFieldsValue({ dslContent: v }); }} rows={10} />
          </Form.Item>
          <Form.Item name="dslExplain" label="规则解释">
            <Input.TextArea rows={2} placeholder="用自然语言描述这条规则的业务含义" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

/** 列表中显示关联正式任务数，点击弹窗显示详情 */
const taskStatusColors: Record<string, string> = { INIT: 'default', RUNNING: 'processing', SUCCESS: 'success', FAILED: 'error' };
const taskStatusTexts: Record<string, string> = { INIT: '待运行', RUNNING: '运行中', SUCCESS: '成功', FAILED: '失败' };
const submitStatusTexts: Record<string, string> = { PENDING: '待提交', SUBMITTED: '已提交' };

const FormalTaskCountCell: React.FC<{ ruleId: number }> = ({ ruleId }) => {
  const [tasks, setTasks] = useState<any[] | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    ruleApi.getFormalTasks(ruleId).then((res: any) => setTasks(res.data || [])).catch(() => setTasks([]));
  }, [ruleId]);

  if (tasks === null) return <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>...</span>;
  if (tasks.length === 0) return <span style={{ color: 'rgba(255,255,255,0.2)' }}>0</span>;

  return (
    <>
      <a style={{ color: '#0ea5e9', fontWeight: 600, cursor: 'pointer' }} onClick={() => setModalOpen(true)}>{tasks.length}</a>
      <Modal title="关联正式打标任务" open={modalOpen} onCancel={() => setModalOpen(false)} footer={null} width={600} maskClosable={false} destroyOnClose>
        <Table rowKey="taskId" dataSource={tasks} size="small" pagination={false} columns={[
          { title: '任务名称', dataIndex: 'taskName', width: 180 },
          { title: '任务编号', dataIndex: 'taskNo', width: 140, render: (v: string) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v}</span> },
          { title: '运行状态', dataIndex: 'taskStatus', width: 100, render: (s: string) => <Tag color={taskStatusColors[s]}>{taskStatusTexts[s] || s}</Tag> },
          { title: '提交状态', dataIndex: 'submitStatus', width: 100, render: (s: string) => <Tag color={s === 'SUBMITTED' ? 'processing' : 'default'}>{submitStatusTexts[s] || s || '-'}</Tag> },
        ]} />
      </Modal>
    </>
  );
};
