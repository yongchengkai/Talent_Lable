import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Table, Space, Modal, Form, Input, Select, Tag, message, Popconfirm, Tooltip } from 'antd';
import { PlusOutlined, SearchOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { tagApi, categoryApi } from '@/services/api';

const { Option } = Select;

export default function TagDefinitionPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [filterCategory, setFilterCategory] = useState<number | undefined>();
  const [filterStatus, setFilterStatus] = useState<string>();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form] = Form.useForm();

  // 详情弹窗
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRecord, setDetailRecord] = useState<any>(null);

  const fetchData = async (page = current, size = pageSize) => {
    setLoading(true);
    try {
      const res: any = await tagApi.page({ current: page, size, keyword, categoryId: filterCategory, status: filterStatus });
      setData(res.data.records);
      setTotal(res.data.total);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    const res: any = await categoryApi.listActive();
    setCategories(res.data);
  };

  useEffect(() => { fetchData(1); fetchCategories(); }, []);

  const openCreate = () => {
    setEditingId(null);
    form.resetFields();
    form.setFieldsValue({ tagCode: 'TAG_' });
    setModalOpen(true);
  };

  const openEdit = (record: any) => { setEditingId(record.id); form.setFieldsValue(record); setModalOpen(true); };

  const openDetail = (record: any) => {
    setDetailRecord(record);
    setDetailOpen(true);
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    if (editingId) {
      await tagApi.update(editingId, { ...values, updatedBy: 'admin' });
      message.success('更新成功');
    } else {
      await tagApi.create({ ...values, createdBy: 'admin', updatedBy: 'admin' });
      message.success('创建成功');
    }
    setModalOpen(false);
    fetchData();
  };

  const handleStatusToggle = async (record: any) => {
    const newStatus = record.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    // 停用时检查是否被任意规则引用
    if (newStatus === 'INACTIVE') {
      try {
        const rules = await loadRules(record.id);
        if (rules && rules.length > 0) {
          Modal.info({
            title: '无法停用',
            icon: <ExclamationCircleOutlined style={{ color: '#0ea5e9' }} />,
            content: `标签「${record.tagName}」被 ${rules.length} 条规则引用，无法停用。请先移除规则中对该标签的引用后再操作。`,
            okText: '前往条件打标规则',
            okCancel: true,
            cancelText: '取消',
            onOk: () => navigate('/app/rules/structured'),
          });
          return;
        }
      } catch {}
    }
    try {
      await tagApi.updateStatus(record.id, newStatus);
      message.success(newStatus === 'ACTIVE' ? '已启用' : '已停用');
      fetchData();
    } catch (e: any) {
      message.error(e.message);
    }
  };

  const handleDelete = async (record: any) => {
    // 检查是否有规则引用
    try {
      const rules = await loadRules(record.id);
      if (rules && rules.length > 0) {
        Modal.info({
          title: '无法删除',
          icon: <ExclamationCircleOutlined style={{ color: '#0ea5e9' }} />,
          content: `标签「${record.tagName}」被 ${rules.length} 条规则引用，请先移除规则中对该标签的引用后再删除。`,
          okText: '前往条件打标规则',
          okCancel: true,
          cancelText: '取消',
          onOk: () => navigate('/app/rules/structured'),
        });
        return;
      }
    } catch {}
    try {
      await tagApi.delete(record.id);
      message.success('删除成功');
      fetchData();
    } catch (e: any) {
      if (e?.message?.includes('历史打标结果')) {
        Modal.info({
          title: '无法删除',
          icon: <ExclamationCircleOutlined style={{ color: '#0ea5e9' }} />,
          content: `标签「${record.tagName}」存在历史打标结果引用。为保证历史追溯一致性，请保留该标签。`,
          okText: '我知道了',
        });
        return;
      }
      message.error(e.message);
    }
  };

  const getCategoryName = (id: number) => categories.find(c => c.id === id)?.categoryName || '-';

  const ruleTypeMap: Record<string, { text: string; color: string }> = {
    STRUCTURED: { text: '条件', color: 'blue' },
    AI_SEMANTIC: { text: 'AI', color: 'purple' },
  };

  // 缓存引用规则
  const [rulesCache, setRulesCache] = useState<Record<number, any[]>>({});
  const loadRules = async (tagId: number) => {
    if (rulesCache[tagId]) return rulesCache[tagId];
    try {
      const res: any = await tagApi.getRules(tagId);
      const rules = res.data || [];
      setRulesCache(prev => ({ ...prev, [tagId]: rules }));
      return rules;
    } catch { return []; }
  };

  const columns = [
    {
      title: '标签名称', dataIndex: 'tagName', width: 150,
      render: (name: string, record: any) => (
        <a className="action-link" style={{ fontWeight: 500 }} onClick={() => openDetail(record)}>{name}</a>
      ),
    },
    { title: '标签编码', dataIndex: 'tagCode', width: 160 },
    { title: '所属类目', dataIndex: 'categoryId', width: 140, render: (id: number) => getCategoryName(id) },
    { title: '说明', dataIndex: 'description', ellipsis: true },
    {
      title: '引用规则', dataIndex: 'id', width: 180,
      render: (_: any, record: any) => <RuleRefCell tagId={record.id} loadRules={loadRules} ruleTypeMap={ruleTypeMap} />,
    },
    { title: '状态', dataIndex: 'status', width: 80, render: (s: string) => <Tag color={s === 'ACTIVE' ? 'green' : 'default'}>{s === 'ACTIVE' ? '启用' : '停用'}</Tag> },
    {
      title: '操作', width: 220,
      render: (_: any, record: any) => {
        const rules = rulesCache[record.id] || [];
        const hasRules = rules.length > 0;
        const hasPublishedRules = rules.some((r: any) => r.status === 'PUBLISHED');
        const publishedCount = rules.filter((r: any) => r.status === 'PUBLISHED').length;
        return (
          <Space>
            <a className="action-link" onClick={() => openEdit(record)}>编辑</a>
            {record.status === 'ACTIVE' ? (
              <a className="action-link action-link-danger" onClick={() => handleStatusToggle(record)}>停用</a>
            ) : (
              <a className="action-link action-link-success" onClick={() => handleStatusToggle(record)}>启用</a>
            )}
            <a className="action-link action-link-danger" onClick={() => handleDelete(record)}>删除</a>
          </Space>
        );
      },
    },
  ];

  return (
    <div className="page-container">
      <div className="page-toolbar">
        <Space>
          <Input placeholder="搜索标签名称、编码" value={keyword} onChange={(e) => setKeyword(e.target.value)} onPressEnter={() => fetchData(1)} prefix={<SearchOutlined />} style={{ width: 200 }} />
          <Select placeholder="所属类目" allowClear style={{ width: 160 }} value={filterCategory} onChange={setFilterCategory} options={categories.map(c => ({ label: c.categoryName, value: c.id }))} />
          <Select placeholder="状态" allowClear style={{ width: 100 }} value={filterStatus} onChange={setFilterStatus}>
            <Option value="ACTIVE">启用</Option><Option value="INACTIVE">停用</Option>
          </Select>
          <Button onClick={() => fetchData(1)}>查询</Button>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新建</Button>
      </div>

      <Table rowKey="id" columns={columns} dataSource={data} loading={loading}
        pagination={{
          current,
          total,
          pageSize,
          showTotal: (t) => `共 ${t} 条`,
          showSizeChanger: true,
          showQuickJumper: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          onChange: (p, s) => { setCurrent(p); setPageSize(s); fetchData(p, s); },
        }} />

      {/* 新建/编辑标签 */}
      <Modal title={editingId ? '编辑标签' : '新建标签'} open={modalOpen} onOk={handleSave} onCancel={() => setModalOpen(false)} width={560} maskClosable={false} destroyOnClose>
        <Form form={form} layout="vertical">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="tagCode" label="标签编码" rules={[{ required: true, message: '请输入标签编码' }]}
              extra="前缀 TAG_，后缀仅 A-Z、0-9、_">
              <Input disabled={!!editingId} placeholder="TAG_" />
            </Form.Item>
            <Form.Item name="tagName" label="标签名称" rules={[{ required: true, message: '请输入标签名称' }]}>
              <Input />
            </Form.Item>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="categoryId" label="所属类目" rules={[{ required: true, message: '请选择所属类目' }]}>
              <Select options={categories.map(c => ({ label: c.categoryName, value: c.id }))} />
            </Form.Item>
            {editingId && (
              <Form.Item label="状态">
                <Input value={form.getFieldValue('status') === 'ACTIVE' ? '启用' : '停用'} disabled />
              </Form.Item>
            )}
          </div>
          <Form.Item name="description" label="说明">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 标签详情弹窗 */}
      <Modal
        title="标签详情"
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        maskClosable={false}
        footer={
          <Space>
            <Button onClick={() => { setDetailOpen(false); if (detailRecord) openEdit(detailRecord); }}>编辑</Button>
            <Button onClick={() => setDetailOpen(false)}>关闭</Button>
          </Space>
        }
        destroyOnClose
      >
        {detailRecord && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}>
            <div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>标签名称</div>
              <div style={{ fontWeight: 600, color: 'rgba(255,255,255,0.92)' }}>{detailRecord.tagName}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>标签编码</div>
              <div style={{ fontWeight: 600, color: 'rgba(255,255,255,0.92)', fontFamily: "'JetBrains Mono', monospace" }}>{detailRecord.tagCode}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>所属类目</div>
              <div style={{ color: 'rgba(255,255,255,0.92)' }}>{getCategoryName(detailRecord.categoryId)}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>状态</div>
              <Tag color={detailRecord.status === 'ACTIVE' ? 'green' : 'default'}>
                {detailRecord.status === 'ACTIVE' ? '启用' : '停用'}
              </Tag>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>说明</div>
              <div style={{ color: 'rgba(255,255,255,0.92)' }}>{detailRecord.description || '-'}</div>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>引用规则</div>
              <DetailRuleRef tagId={detailRecord.id} loadRules={loadRules} ruleTypeMap={ruleTypeMap} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

/** 列表中的引用规则单元格：懒加载 */
function RuleRefCell({ tagId, loadRules, ruleTypeMap }: { tagId: number; loadRules: (id: number) => Promise<any[]>; ruleTypeMap: Record<string, { text: string; color: string }> }) {
  const [rules, setRules] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    loadRules(tagId).then(r => { setRules(r); setLoading(false); });
  }, [tagId]);

  if (loading) return <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>加载中...</span>;
  if (!rules || rules.length === 0) return <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>;

  return (
    <Space size={4} wrap>
      {rules.slice(0, 3).map((r: any) => (
        <Tooltip key={r.ruleId} title={`${r.ruleCode} · ${r.ruleName}`}>
          <Tag color={ruleTypeMap[r.ruleType]?.color} style={{ fontSize: 11, margin: 0 }}>
            {r.ruleName.length > 8 ? r.ruleName.slice(0, 8) + '...' : r.ruleName}
          </Tag>
        </Tooltip>
      ))}
      {rules.length > 3 && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>+{rules.length - 3}</span>}
    </Space>
  );
}

/** 详情弹窗中的引用规则展示 */
function DetailRuleRef({ tagId, loadRules, ruleTypeMap }: { tagId: number; loadRules: (id: number) => Promise<any[]>; ruleTypeMap: Record<string, { text: string; color: string }> }) {
  const [rules, setRules] = useState<any[]>([]);

  useEffect(() => {
    loadRules(tagId).then(setRules);
  }, [tagId]);

  if (rules.length === 0) return <div style={{ color: 'rgba(255,255,255,0.3)' }}>暂无引用</div>;

  return (
    <Space size={[6, 6]} wrap>
      {rules.map((r: any) => (
        <Tag key={r.ruleId} color={ruleTypeMap[r.ruleType]?.color}>
          {r.ruleName}（{r.ruleCode}）
        </Tag>
      ))}
    </Space>
  );
}
