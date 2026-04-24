import { useEffect, useState } from 'react';
import { Button, Table, Space, Modal, Form, Input, Select, Tag, message, Popconfirm } from 'antd';
import { PlusOutlined, SearchOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { ruleApi, tagApi } from '@/services/api';
import ActionLink from '@/components/ActionLink';
import TagMentionTextArea, { extractTagRefs } from '@/components/TagMentionTextArea';

const { Option } = Select;

export default function RuleSemanticPage({ embedded, embeddedFilters, embeddedPrefill, embeddedAction, onNavigate }: { embedded?: boolean; embeddedFilters?: Record<string, string>; embeddedPrefill?: Record<string, any>; embeddedAction?: string; onNavigate?: (page: string, filters?: Record<string, string>) => void } = {}) {
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
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRecord, setDetailRecord] = useState<any>(null);
  const [allTags, setAllTags] = useState<any[]>([]);

  const fetchData = async (page = current, size = pageSize) => {
    setLoading(true);
    try {
      const res: any = await ruleApi.page({ current: page, size, keyword, status: filterStatus, ruleType: 'AI_SEMANTIC' });
      setData(res.data.records);
      setTotal(res.data.total);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchData(1);
    tagApi.page({ current: 1, size: 500, status: 'ACTIVE' }).then((res: any) => {
      setAllTags(res.data?.records || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (embedded && embeddedAction === 'create') {
      setCreateDone(false);
      const prefill = embeddedPrefill || {};
      setEditingId(null); form.resetFields();
      form.setFieldsValue({ ruleCode: 'AR_', ...prefill });
    } else if (embedded && embeddedAction === 'edit') {
      setEditDone(false);
      const prefill = embeddedPrefill || {};
      const id = prefill.id !== undefined ? Number(prefill.id) : null;
      setEditingId(id && !Number.isNaN(id) ? id : null);
      form.resetFields();
      const doFill = async () => {
        if (id && !Number.isNaN(id)) {
          try {
            const res: any = await ruleApi.getById(id);
            form.setFieldsValue(res.data || {});
            return;
          } catch {}
        }
        form.setFieldsValue(prefill);
      };
      doFill();
    }
  }, [embedded, embeddedAction, embeddedPrefill]);

  const openCreate = () => {
    setEditingId(null); form.resetFields();
    form.setFieldsValue({ ruleCode: 'AR_' });
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
    setEditingId(record.id); form.setFieldsValue(record);
    setModalOpen(true);
  };

  const openCopy = (record: any) => {
    setEditingId(null);
    form.resetFields();
    form.setFieldsValue({
      ruleName: record.ruleName + ' (副本)',
      dslContent: record.dslContent,
      inputFields: record.inputFields,
      remark: record.remark,
    });
    setModalOpen(true);
  };

  const openDetail = (record: any) => {
    setDetailRecord(record);
    setDetailOpen(true);
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    const payload = { ...values, ruleType: 'AI_SEMANTIC', createdBy: 'admin', updatedBy: 'admin' };
    let ruleId = editingId;
    if (editingId) {
      await ruleApi.update(editingId, payload); message.success('更新成功');
    } else {
      const res: any = await ruleApi.create(payload); message.success('创建成功');
      ruleId = res.data?.id;
    }
    // 从语义描述中提取 # 引用的标签，自动保存为输出标签
    if (ruleId && allTags.length > 0) {
      const refs = extractTagRefs(values.dslContent, allTags);
      const tagIds = refs.map(t => t.id);
      if (tagIds.length > 0) {
        try { await ruleApi.saveOutputTags(ruleId, tagIds); } catch {}
      }
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
    { title: '规则编码', dataIndex: 'ruleCode', width: 150 },
    { title: '语义规则描述', dataIndex: 'dslContent', ellipsis: true, width: 200 },
    {
      title: '输出标签', dataIndex: 'dslContent', width: 180,
      render: (dsl: string) => <InlineTagRefs dslContent={dsl} allTags={allTags} />,
    },
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
          <span style={{ color: '#10b981', fontWeight: 500, fontSize: 13 }}>✓ 智能打标规则创建成功</span>
        </div>
      );
    }
    return (
      <div style={{ width: '100%', maxWidth: '100%', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden', margin: '8px 0' }}>
        <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>新建智能打标规则</span>
        </div>
        <div style={{ padding: '12px 16px' }}>
          <Form form={form} layout="vertical" size="small">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
              <Form.Item name="ruleCode" label={<span style={{ fontSize: 12 }}>规则编码</span>} rules={[{ required: true }]}>
                <Input placeholder="AR_" style={{ fontSize: 12 }} />
              </Form.Item>
              <Form.Item name="ruleName" label={<span style={{ fontSize: 12 }}>规则名称</span>} rules={[{ required: true }]}>
                <Input style={{ fontSize: 12 }} />
              </Form.Item>
            </div>
            <Form.Item name="dslContent" label={<span style={{ fontSize: 12 }}>语义规则描述</span>} rules={[{ required: true }]}>
              <TagMentionTextArea rows={4} placeholder="例如：根据毕业院校判断是否属于 #{985院校（TAG_985）} 院校..." />
            </Form.Item>
            <Form.Item name="remark" label={<span style={{ fontSize: 12 }}>备注</span>} style={{ marginBottom: 8 }}>
              <Input.TextArea rows={2} style={{ fontSize: 12 }} />
            </Form.Item>
            <div style={{ textAlign: 'right' }}>
              <Button type="primary" size="small" style={{ fontSize: 12 }} onClick={async () => {
                try {
                  const values = await form.validateFields();
                  const res: any = await ruleApi.create({ ...values, ruleType: 'AI_SEMANTIC', createdBy: 'admin', updatedBy: 'admin' });
                  message.success('规则创建成功');
                  // 自动保存输出标签
                  const ruleId = res.data?.id;
                  if (ruleId && allTags.length > 0) {
                    const refs = extractTagRefs(values.dslContent, allTags);
                    const tagIds = refs.map((t: any) => t.id);
                    if (tagIds.length > 0) {
                      try { await ruleApi.saveOutputTags(ruleId, tagIds); } catch {}
                    }
                  }
                  setCreateDone(true);
                } catch (e: any) {
                  if (e.message) message.error(e.message);
                }
              }}>创建</Button>
            </div>
          </Form>
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
          <span style={{ color: '#10b981', fontWeight: 500, fontSize: 13 }}>✓ 智能打标规则更新成功</span>
        </div>
      );
    }
    return (
      <div style={{ width: '100%', maxWidth: '100%', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden', margin: '8px 0' }}>
        <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>编辑智能打标规则</span>
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
            <Form.Item name="dslContent" label={<span style={{ fontSize: 12 }}>语义规则描述</span>} rules={[{ required: true }]}>
              <TagMentionTextArea rows={4} placeholder="例如：根据毕业院校判断是否属于 #{985院校（TAG_985）} 院校..." />
            </Form.Item>
            <Form.Item name="remark" label={<span style={{ fontSize: 12 }}>备注</span>} style={{ marginBottom: 8 }}>
              <Input.TextArea rows={2} style={{ fontSize: 12 }} />
            </Form.Item>
            <div style={{ textAlign: 'right' }}>
              <Button type="primary" size="small" style={{ fontSize: 12 }} onClick={async () => {
                try {
                  const values = await form.validateFields();
                  await ruleApi.update(editingId, { ...values, ruleType: 'AI_SEMANTIC', updatedBy: 'admin' });
                  // 自动保存输出标签
                  if (allTags.length > 0) {
                    const refs = extractTagRefs(values.dslContent, allTags);
                    const tagIds = refs.map((t: any) => t.id);
                    try { await ruleApi.saveOutputTags(editingId, tagIds); } catch {}
                  }
                  message.success('规则更新成功');
                  setEditDone(true);
                } catch (e: any) {
                  if (e.message) message.error(e.message);
                }
              }}>保存</Button>
            </div>
          </Form>
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
          <Button type="link" size="small" style={{ fontSize: 12, padding: 0 }} onClick={() => onNavigate?.('/app/rules/semantic')}>
            在页面中查看 →
          </Button>
        </div>
      )}

      {/* 详情弹窗 */}
      <Modal title="AI 语义规则详情" open={detailOpen} onCancel={() => setDetailOpen(false)} maskClosable={false} footer={
        <Space>
          {detailRecord?.status !== 'PUBLISHED' && <Button onClick={() => { setDetailOpen(false); openEdit(detailRecord); }}>编辑</Button>}
          <Button onClick={() => setDetailOpen(false)}>关闭</Button>
        </Space>
      } width={600} destroyOnClose>
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
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>语义规则描述</div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 8, fontSize: 13, border: '1px solid rgba(255,255,255,0.06)', whiteSpace: 'pre-wrap' }}>{detailRecord.dslContent || '-'}</div>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>引用标签</div>
              <DetailReferencedTags dslContent={detailRecord.dslContent} allTags={allTags} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>备注</div>
              <div style={{ color: 'rgba(255,255,255,0.92)' }}>{detailRecord.remark || '-'}</div>
            </div>
          </div>
        )}
      </Modal>

      {/* 编辑弹窗 */}
      <Modal title={editingId ? '编辑' : '新建'} open={modalOpen} onOk={handleSave} onCancel={() => setModalOpen(false)} width={700} maskClosable={false} destroyOnClose>
        <Form form={form} layout="vertical">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="ruleCode" label="规则编码" rules={[{ required: true }]}>
              <Input disabled={!!editingId} />
            </Form.Item>
            <Form.Item name="ruleName" label="规则名称" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </div>
          <Form.Item name="dslContent" label="语义规则描述" rules={[{ required: true }]}>
            <TagMentionTextArea rows={5} placeholder="例如：根据毕业院校判断是否属于 #{985院校（TAG_985）} #{211院校（TAG_211）} 院校，参考教育部官方名单..." />
          </Form.Item>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: -12, marginBottom: 16 }}>
            输入 # 可插入标签引用，格式为 {'#{标签名称（标签编码）}'}，标签必须是标签定义中已有的启用标签
          </div>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

/** 列表中直接从 dslContent 提取引用标签展示 */
const InlineTagRefs: React.FC<{ dslContent: string; allTags: any[] }> = ({ dslContent, allTags }) => {
  if (!dslContent) return <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>;
  const refs = extractTagRefs(dslContent, allTags);
  if (refs.length === 0) {
    // 兜底：即使 allTags 还没加载完，也尝试从文本直接提取显示名
    const regex = /#\{([^}]+?)（([^)]+?)）\}/g;
    const names: string[] = [];
    let m;
    while ((m = regex.exec(dslContent)) !== null) names.push(m[1]);
    if (names.length === 0) return <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>;
    return (
      <Space size={4} wrap>
        {names.map((n, i) => <Tag key={i} color="cyan" style={{ fontSize: 11, margin: 0 }}>{n}</Tag>)}
      </Space>
    );
  }
  return (
    <Space size={4} wrap>
      {refs.map(t => <Tag key={t.id} color="cyan" style={{ fontSize: 11, margin: 0 }}>{t.tagName}</Tag>)}
    </Space>
  );
};

/** 详情弹窗中从 dslContent 提取引用标签展示 */
const DetailReferencedTags: React.FC<{ dslContent: string; allTags: any[] }> = ({ dslContent, allTags }) => {
  const refs = extractTagRefs(dslContent, allTags);
  if (refs.length === 0) return <span style={{ color: 'rgba(255,255,255,0.3)' }}>未引用标签</span>;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {refs.map(t => <Tag key={t.id} color="cyan">{t.tagName}</Tag>)}
    </div>
  );
};

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
