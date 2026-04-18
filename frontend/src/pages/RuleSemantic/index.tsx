import { useEffect, useState } from 'react';
import { Button, Table, Space, Modal, Form, Input, Select, Tag, message, Popconfirm } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { ruleApi, tagApi, categoryApi } from '@/services/api';
import TagMentionTextArea, { extractTagRefs } from '@/components/TagMentionTextArea';

const { Option } = Select;

const inputFieldOptions = [
  { label: '毕业院校', value: 'university' },
  { label: '简历全文', value: 'resume_text' },
  { label: '项目经历', value: 'project_experience' },
  { label: '岗位名称', value: 'job_title' },
  { label: '专业', value: 'major' },
  { label: '工作经历', value: 'work_experience' },
];

export default function RuleSemanticPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>();
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

  const openCreate = () => {
    setEditingId(null); form.resetFields();
    form.setFieldsValue({ ruleCode: 'AR_' });
    setModalOpen(true);
  };

  const openEdit = async (record: any) => {
    if (record.status === 'PUBLISHED') {
      Modal.info({
        title: '无法编辑',
        content: `规则「${record.ruleName}」已发布，不可直接编辑。请先复制为新规则后再修改。`,
        okText: '复制规则',
        okCancel: true,
        cancelText: '取消',
        onOk: () => openCopy(record),
      });
      return;
    }
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
    try { await ruleApi.stop(record.id); message.success('已撤销发布'); fetchData(); }
    catch (e: any) { message.error(e.message || '撤销失败'); }
  };

  const publishStatusMap: Record<string, { text: string; color: string }> = {
    UNPUBLISHED: { text: '未发布', color: 'default' }, PUBLISHED: { text: '已发布', color: 'green' },
  };
  const runStatusMap: Record<string, { text: string; color: string }> = {
    NOT_RUN: { text: '未运行', color: 'default' }, RUN_SUCCESS: { text: '运行成功', color: 'green' }, RUN_FAILED: { text: '运行失败', color: 'red' },
  };

  const columns = [
    { title: '规则名称', dataIndex: 'ruleName', width: 180, render: (name: string, record: any) => <a className="action-link" style={{ fontWeight: 500 }} onClick={() => openDetail(record)}>{name}</a> },
    { title: '规则编码', dataIndex: 'ruleCode', width: 150 },
    { title: '语义规则描述', dataIndex: 'dslContent', ellipsis: true, width: 200 },
    {
      title: '输出标签', dataIndex: 'dslContent', width: 180,
      render: (dsl: string) => <InlineTagRefs dslContent={dsl} allTags={allTags} />,
    },
    { title: '发布状态', dataIndex: 'status', width: 90, render: (s: string) => <Tag color={publishStatusMap[s]?.color}>{publishStatusMap[s]?.text}</Tag> },
    { title: '正式打标状态', dataIndex: 'runStatus', width: 110, render: (s: string, record: any) => record.status === 'PUBLISHED' || record.runStatus ? <Tag color={runStatusMap[s]?.color}>{runStatusMap[s]?.text || '-'}</Tag> : <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span> },
    {
      title: '操作', width: 280,
      render: (_: any, record: any) => (
        <Space>
          {record.status !== 'PUBLISHED' && <a className="action-link" onClick={() => openEdit(record)}>编辑</a>}
          {record.status !== 'PUBLISHED' && <a className="action-link action-link-success" onClick={() => handlePublish(record)}>发布</a>}
          {record.status === 'PUBLISHED' && <a className="action-link action-link-danger" onClick={() => handleUnpublish(record)}>撤销发布</a>}
          <a className="action-link" onClick={() => openCopy(record)}>复制</a>
          {record.status !== 'PUBLISHED' && !record.runStatus && (
            <a className="action-link action-link-danger" onClick={async () => { try { await ruleApi.delete(record.id); message.success('删除成功'); fetchData(); } catch (e: any) { message.error(e.message || '删除失败'); } }}>删除</a>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="page-container">
      <div className="page-toolbar">
        <Space>
          <Input placeholder="搜索规则名称、编码" value={keyword} onChange={(e) => setKeyword(e.target.value)} onPressEnter={() => fetchData(1)} prefix={<SearchOutlined />} style={{ width: 240 }} />
          <Select placeholder="发布状态" allowClear style={{ width: 120 }} value={filterStatus} onChange={v => { setFilterStatus(v); }}>
            <Option value="UNPUBLISHED">未发布</Option><Option value="PUBLISHED">已发布</Option>
          </Select>
          <Button onClick={() => fetchData(1)}>查询</Button>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新建</Button>
      </div>

      <Table rowKey="id" columns={columns} dataSource={data} loading={loading}
        pagination={{ current, total, pageSize, showTotal: (t) => `共 ${t} 条`, showSizeChanger: true, showQuickJumper: true, pageSizeOptions: ['10', '20', '50', '100'], onChange: (p, s) => { setCurrent(p); setPageSize(s); fetchData(p, s); } }} />

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
          <Form.Item name="inputFields" label="选择字段" extra="选择 AI 需要分析的输入字段">
            <Select mode="multiple" placeholder="选择输入字段" options={inputFieldOptions} />
          </Form.Item>
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
