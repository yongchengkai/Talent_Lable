import { useEffect, useState } from 'react';
import { Button, Table, Space, Modal, Form, Input, Tag, Select, message, Popconfirm, Tooltip } from 'antd';
import { PlusOutlined, SearchOutlined, TagsOutlined, SwapOutlined, SwapRightOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { categoryApi, tagApi } from '@/services/api';

const { Option } = Select;

export default function TagCategoryPage({ embedded, embeddedFilters, embeddedPrefill, embeddedAction, onNavigate }: { embedded?: boolean; embeddedFilters?: Record<string, string>; embeddedPrefill?: Record<string, any>; embeddedAction?: string; onNavigate?: (page: string, filters?: Record<string, string>) => void } = {}) {
  const routerNavigate = useNavigate();
  const doNavigate = embedded ? onNavigate : (page: string) => routerNavigate(page);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState(embeddedFilters?.keyword || '');
  const [filterStatus, setFilterStatus] = useState<string | undefined>(embeddedFilters?.status);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [form] = Form.useForm();

  // 标签弹窗
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [tagModalTitle, setTagModalTitle] = useState('');
  const [tagData, setTagData] = useState<any[]>([]);
  const [tagLoading, setTagLoading] = useState(false);
  const [tagTotal, setTagTotal] = useState(0);
  const [tagPage, setTagPage] = useState(1);
  const [tagModalCatId, setTagModalCatId] = useState<number | null>(null);

  // 详情弹窗
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRecord, setDetailRecord] = useState<any>(null);

  // 编辑弹窗内的迁移功能
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [migTargetCatId, setMigTargetCatId] = useState<number | undefined>();
  const [migLeftTags, setMigLeftTags] = useState<any[]>([]);
  const [migRightTags, setMigRightTags] = useState<any[]>([]);
  const [migLeftSelected, setMigLeftSelected] = useState<number[]>([]);
  const [migRightSelected, setMigRightSelected] = useState<number[]>([]);
  const [migLeftFilter, setMigLeftFilter] = useState('');
  const [migRightFilter, setMigRightFilter] = useState('');

  const fetchData = async (page = current, kw = keyword, size = pageSize) => {
    setLoading(true);
    try {
      const res: any = await categoryApi.page({ current: page, size, keyword: kw, status: filterStatus });
      setData(res.data.records);
      setTotal(res.data.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(1); }, []);

  // embedded 模式下自动触发操作
  useEffect(() => {
    if (embedded && embeddedAction === 'create') {
      setCreateDone(false);
      setEditingId(null);
      setEditingRecord(null);
      form.resetFields();
      form.setFieldsValue({ categoryCode: 'CAT_', ...(embeddedPrefill || {}) });
    } else if (embedded && embeddedAction === 'edit') {
      setEditDone(false);
      const prefill = embeddedPrefill || {};
      const id = prefill.id !== undefined ? Number(prefill.id) : null;
      setEditingId(id && !Number.isNaN(id) ? id : null);
      form.resetFields();
      const doFill = async () => {
        if (id && !Number.isNaN(id)) {
          try {
            const res: any = await categoryApi.getById(id);
            const detail = res.data || {};
            setEditingRecord(detail);
            form.setFieldsValue(detail);
            return;
          } catch {}
        }
        setEditingRecord(prefill);
        form.setFieldsValue(prefill);
      };
      doFill();
    }
  }, [embedded, embeddedAction, embeddedPrefill]);

  const handleSearch = () => { setCurrent(1); fetchData(1, keyword); };

  const openCreate = async () => {
    setEditingId(null);
    setEditingRecord(null);
    form.resetFields();
    form.setFieldsValue({ categoryCode: 'CAT_' });
    setMigLeftTags([]);
    setMigRightTags([]);
    setMigTargetCatId(undefined);
    setMigLeftSelected([]);
    setMigRightSelected([]);
    setMigLeftFilter('');
    setMigRightFilter('');
    // 加载所有启用类目供选择标签来源
    try {
      const catRes: any = await categoryApi.listActive();
      setAllCategories(catRes.data || []);
    } catch { setAllCategories([]); }
    setModalOpen(true);
  };

  const openEdit = async (record: any) => {
    setEditingId(record.id);
    setEditingRecord(record);
    form.setFieldsValue(record);
    // 加载迁移数据
    setMigLeftFilter('');
    setMigRightFilter('');
    setMigLeftSelected([]);
    setMigTargetCatId(undefined);
    setMigRightTags([]);
    try {
      const [catRes, tagRes]: any[] = await Promise.all([
        categoryApi.listActive(),
        tagApi.page({ current: 1, size: 500, categoryId: record.id }),
      ]);
      setAllCategories(catRes.data || []);
      setMigLeftTags(tagRes.data.records || []);
    } catch {
      setAllCategories([]);
      setMigLeftTags([]);
    }
    setModalOpen(true);
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    if (editingId) {
      await categoryApi.update(editingId, { ...values, updatedBy: 'admin' });
      message.success('更新成功');
    } else {
      const res: any = await categoryApi.create({ ...values, createdBy: 'admin', updatedBy: 'admin' });
      message.success('创建成功');
      // 新建后，如果选了标签则执行迁移
      if (migLeftSelected.length > 0 && migTargetCatId && res.data?.id) {
        try {
          await tagApi.migrate(migLeftSelected, res.data.id);
          message.success(`已将 ${migLeftSelected.length} 个标签迁入新类目`);
        } catch { message.warning('标签迁移失败，请手动处理'); }
      }
    }
    setModalOpen(false);
    fetchData();
  };

  const handleStatusToggle = async (record: any) => {
    const newStatus = record.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await categoryApi.updateStatus(record.id, newStatus);
      message.success(newStatus === 'ACTIVE' ? '已启用' : '已停用');
      fetchData();
    } catch (e: any) {
      if (newStatus === 'INACTIVE' && (record.activeTagCount > 0)) {
        Modal.confirm({
          title: '无法停用',
          icon: <SwapOutlined style={{ color: '#0ea5e9' }} />,
          content: `类目「${record.categoryName}」下仍有 ${record.activeTagCount} 个启用标签，请先停用或迁移标签后再停用类目。`,
          okText: '前往标签迁移',
          cancelText: '取消',
          onOk: () => doNavigate?.(`/app/tag-migration?sourceCatId=${record.id}`),
        });
      } else {
        message.error(e.message);
      }
    }
  };

  const handleDelete = async (record: any) => {
    if (record.tagCount > 0) {
      Modal.info({
        title: '无法删除',
        icon: <SwapOutlined style={{ color: '#0ea5e9' }} />,
        content: `类目「${record.categoryName}」下仍有 ${record.tagCount} 个标签，请先将标签迁移到其他类目后再执行删除操作。`,
        okText: '前往标签迁移',
        okCancel: true,
        cancelText: '取消',
        onOk: () => doNavigate?.(`/app/tag-migration?sourceCatId=${record.id}`),
      });
      return;
    }
    try {
      await categoryApi.delete(record.id);
      message.success('删除成功');
      fetchData();
    } catch (e: any) {
      message.error(e.message || '删除失败');
    }
  };

  // 编辑弹窗内迁移
  const loadMigTargetTags = async (catId: number) => {
    try {
      const res: any = await tagApi.page({ current: 1, size: 500, categoryId: catId });
      setMigRightTags(res.data.records || []);
    } catch {
      setMigRightTags([]);
    }
  };

  const handleMigTargetChange = (catId: number) => {
    setMigTargetCatId(catId);
    setMigRightFilter('');
    loadMigTargetTags(catId);
  };

  const handleMigrate = async () => {
    if (!migTargetCatId || migLeftSelected.length === 0 || !editingRecord) return;
    try {
      await tagApi.migrate(migLeftSelected, migTargetCatId!);
      message.success(`已迁移 ${migLeftSelected.length} 个标签`);
      setMigLeftSelected([]);
      const [leftRes, rightRes]: any[] = await Promise.all([
        tagApi.page({ current: 1, size: 500, categoryId: editingRecord.id }),
        tagApi.page({ current: 1, size: 500, categoryId: migTargetCatId }),
      ]);
      setMigLeftTags(leftRes.data.records || []);
      setMigRightTags(rightRes.data.records || []);
      fetchData();
    } catch (e: any) { message.error(e.message); }
  };

  const handleMigrateBack = async () => {
    if (!editingRecord || migRightSelected.length === 0) return;
    try {
      await tagApi.migrate(migRightSelected, editingRecord.id);
      message.success(`已迁入 ${migRightSelected.length} 个标签`);
      setMigRightSelected([]);
      const [leftRes, rightRes]: any[] = await Promise.all([
        tagApi.page({ current: 1, size: 500, categoryId: editingRecord.id }),
        migTargetCatId ? tagApi.page({ current: 1, size: 500, categoryId: migTargetCatId }) : Promise.resolve({ data: { records: [] } }),
      ]);
      setMigLeftTags(leftRes.data.records || []);
      setMigRightTags(rightRes.data.records || []);
      fetchData();
    } catch (e: any) { message.error(e.message); }
  };

  const filterTags = (tags: any[], kw: string) => {
    if (!kw.trim()) return tags;
    const k = kw.toLowerCase();
    return tags.filter(t => t.tagName?.toLowerCase().includes(k) || t.tagCode?.toLowerCase().includes(k));
  };

  // 查看标签列表
  const openTagModal = async (record: any, page = 1) => {
    setTagModalTitle(record.categoryName);
    setTagModalCatId(record.id);
    setTagModalOpen(true);
    setTagPage(page);
    setTagLoading(true);
    try {
      const res: any = await tagApi.page({ current: page, size: 10, categoryId: record.id });
      setTagData(res.data.records || []);
      setTagTotal(res.data.total || 0);
    } catch {
      setTagData([]);
      setTagTotal(0);
    } finally {
      setTagLoading(false);
    }
  };

  const openDetail = (record: any) => {
    setDetailRecord(record);
    setDetailOpen(true);
  };

  const smallTagColumns = [
    { title: '标签名称', dataIndex: 'tagName', width: 120 },
    { title: '标签编码', dataIndex: 'tagCode', width: 130 },
    { title: '状态', dataIndex: 'status', width: 70, render: (s: string) => <Tag color={s === 'ACTIVE' ? 'green' : 'default'}>{s === 'ACTIVE' ? '启用' : '停用'}</Tag> },
  ];

  const viewTagColumns = [
    { title: '标签名称', dataIndex: 'tagName', width: 140 },
    { title: '标签编码', dataIndex: 'tagCode', width: 160 },
    { title: '状态', dataIndex: 'status', width: 80, render: (s: string) => <Tag color={s === 'ACTIVE' ? 'green' : 'default'}>{s === 'ACTIVE' ? '启用' : '停用'}</Tag> },
    { title: '说明', dataIndex: 'description', ellipsis: true },
  ];

  const columns = [
    {
      title: '类目名称', dataIndex: 'categoryName', width: 180,
      render: (name: string, record: any) => (
        embedded ? <span style={{ fontWeight: 500 }}>{name}</span> :
        <a className="action-link" style={{ fontWeight: 500 }} onClick={() => openDetail(record)}>{name}</a>
      ),
    },
    { title: '类目编码', dataIndex: 'categoryCode', width: 160 },
    { title: '说明', dataIndex: 'description', ellipsis: true },
    {
      title: '标签数量', dataIndex: 'tagCount', width: 140,
      render: (_: number, record: any) => (
        embedded ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <TagsOutlined style={{ fontSize: 12 }} />
            <span style={{ color: '#10b981' }}>{record.activeTagCount ?? 0} 启用</span>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>{record.inactiveTagCount ?? 0} 停用</span>
          </span>
        ) : (
        <a className="action-link" onClick={() => openTagModal(record)}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <TagsOutlined style={{ fontSize: 12 }} />
            <span style={{ color: '#10b981' }}>{record.activeTagCount ?? 0} 启用</span>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>{record.inactiveTagCount ?? 0} 停用</span>
          </span>
        </a>
        )
      ),
    },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: (s: string) => <Tag color={s === 'ACTIVE' ? 'green' : 'default'}>{s === 'ACTIVE' ? '启用' : '停用'}</Tag>,
    },
    { title: '创建时间', dataIndex: 'createdAt', width: 180 },
    ...(!embedded ? [{
      title: '操作', width: 220,
      render: (_: any, record: any) => (
        <Space>
          <a className="action-link" onClick={() => openEdit(record)}>编辑</a>
          <a className={record.status === 'ACTIVE' ? 'action-link action-link-danger' : 'action-link action-link-success'}
             onClick={() => handleStatusToggle(record)}>
            {record.status === 'ACTIVE' ? '停用' : '启用'}
          </a>
          <a className="action-link action-link-danger" onClick={() => handleDelete(record)}>删除</a>
        </Space>
      ),
    }] : []),
  ];

  const migLeftFiltered = filterTags(migLeftTags, migLeftFilter);
  const migRightFiltered = filterTags(migRightTags, migRightFilter);

  const [createDone, setCreateDone] = useState(false);
  const [editDone, setEditDone] = useState(false);

  const isEmbeddedCreate = embedded && embeddedAction === 'create';
  const isEmbeddedEdit = embedded && embeddedAction === 'edit';

  // embedded create 模式：直接内联表单
  if (isEmbeddedCreate) {
    if (createDone) {
      return (
        <div style={{ background: 'rgba(16,185,129,0.08)', borderRadius: 8, border: '1px solid rgba(16,185,129,0.2)', padding: '12px 16px', margin: '8px 0' }}>
          <span style={{ color: '#10b981', fontWeight: 500, fontSize: 13 }}>✓ 标签类目创建成功</span>
        </div>
      );
    }
    return (
      <div style={{ width: '100%', maxWidth: '100%', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden', margin: '8px 0' }}>
        <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>新建标签类目</span>
        </div>
        <div style={{ padding: '12px 16px' }}>
          <Form form={form} layout="vertical" size="small" initialValues={{ categoryCode: 'CAT_' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
              <Form.Item name="categoryCode" label={<span style={{ fontSize: 12 }}>类目编码</span>} rules={[{ required: true, message: '请输入类目编码' }]}
                extra={<span style={{ fontSize: 11 }}>前缀 CAT_，全局唯一</span>}>
                <Input placeholder="CAT_" style={{ fontSize: 12 }} />
              </Form.Item>
              <Form.Item name="categoryName" label={<span style={{ fontSize: 12 }}>类目名称</span>} rules={[{ required: true, message: '请输入类目名称' }]}>
                <Input style={{ fontSize: 12 }} />
              </Form.Item>
            </div>
            <Form.Item name="description" label={<span style={{ fontSize: 12 }}>说明</span>} style={{ marginBottom: 8 }}>
              <Input.TextArea rows={2} style={{ fontSize: 12 }} />
            </Form.Item>
            <div style={{ textAlign: 'right' }}>
              <Button type="primary" size="small" style={{ fontSize: 12 }} onClick={async () => {
                try {
                  const values = await form.validateFields();
                  await categoryApi.create({ ...values, createdBy: 'admin', updatedBy: 'admin' });
                  message.success('类目创建成功');
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
          <span style={{ color: '#ef4444', fontWeight: 500, fontSize: 13 }}>缺少类目 ID，无法编辑</span>
        </div>
      );
    }
    if (editDone) {
      return (
        <div style={{ background: 'rgba(16,185,129,0.08)', borderRadius: 8, border: '1px solid rgba(16,185,129,0.2)', padding: '12px 16px', margin: '8px 0' }}>
          <span style={{ color: '#10b981', fontWeight: 500, fontSize: 13 }}>✓ 标签类目更新成功</span>
        </div>
      );
    }
    return (
      <div style={{ width: '100%', maxWidth: '100%', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden', margin: '8px 0' }}>
        <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>编辑标签类目</span>
        </div>
        <div style={{ padding: '12px 16px' }}>
          <Form form={form} layout="vertical" size="small">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
              <Form.Item name="categoryCode" label={<span style={{ fontSize: 12 }}>类目编码</span>} rules={[{ required: true, message: '请输入类目编码' }]}>
                <Input disabled style={{ fontSize: 12 }} />
              </Form.Item>
              <Form.Item name="categoryName" label={<span style={{ fontSize: 12 }}>类目名称</span>} rules={[{ required: true, message: '请输入类目名称' }]}>
                <Input style={{ fontSize: 12 }} />
              </Form.Item>
            </div>
            <Form.Item name="description" label={<span style={{ fontSize: 12 }}>说明</span>} style={{ marginBottom: 8 }}>
              <Input.TextArea rows={2} style={{ fontSize: 12 }} />
            </Form.Item>
            <div style={{ textAlign: 'right' }}>
              <Button type="primary" size="small" style={{ fontSize: 12 }} onClick={async () => {
                try {
                  const values = await form.validateFields();
                  await categoryApi.update(editingId, { ...values, updatedBy: 'admin' });
                  message.success('类目更新成功');
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
          <Input placeholder="搜索类目名称、编码" value={keyword} onChange={(e) => setKeyword(e.target.value)} onPressEnter={handleSearch} prefix={<SearchOutlined />} size={embedded ? 'small' : 'middle'} style={{ width: embedded ? 180 : 240, fontSize: embedded ? 12 : undefined }} />
          <Select placeholder="状态" allowClear size={embedded ? 'small' : 'middle'} style={{ width: embedded ? 80 : 100, fontSize: embedded ? 12 : undefined }} value={filterStatus} onChange={v => { setFilterStatus(v); }}>
            <Option value="ACTIVE">启用</Option><Option value="INACTIVE">停用</Option>
          </Select>
          <Button size={embedded ? 'small' : 'middle'} onClick={handleSearch} style={embedded ? { fontSize: 12 } : undefined}>查询</Button>
          <Button size={embedded ? 'small' : 'middle'} onClick={() => { setKeyword(''); setFilterStatus(undefined); fetchData(1, ''); }} style={embedded ? { fontSize: 12 } : undefined}>重置</Button>
        </Space>
        {!embedded && <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新建</Button>}
      </div>

      <Table rowKey="id" columns={columns} dataSource={data} loading={loading}
        size={embedded ? 'small' : undefined}
        scroll={embedded ? { x: 800 } : undefined}
        style={embedded ? { fontSize: 12 } : undefined}
        pagination={{ current, total, pageSize: embedded ? 10 : pageSize, showTotal: (t) => `共 ${t} 条`, showSizeChanger: true, showQuickJumper: !embedded, pageSizeOptions: embedded ? ['5', '10', '20'] : ['10', '20', '50', '100'], size: embedded ? 'small' : undefined, onChange: (p, s) => { setCurrent(p); setPageSize(s); fetchData(p, keyword, s); } }} />

      {embedded && (
        <div style={{ padding: '4px 12px', borderTop: '1px solid rgba(255,255,255,0.04)', textAlign: 'right' }}>
          <Button type="link" size="small" style={{ fontSize: 12, padding: 0 }} onClick={() => onNavigate?.('/app/tag-categories', { ...(keyword ? { keyword } : {}), ...(filterStatus ? { status: filterStatus } : {}) })}>
            在页面中查看 →
          </Button>
        </div>
      )}

      {/* 新建/编辑类目 */}
      <Modal
        title={editingId ? '编辑类目' : '新建类目'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        width={editingId ? 900 : 720}
        maskClosable={false}
        destroyOnClose
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* 基本信息 */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.92)', marginBottom: 12 }}>类目信息</div>
            <Form form={form} layout="vertical">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                <Form.Item name="categoryCode" label="类目编码" rules={[{ required: true, message: '请输入类目编码' }]}
                  extra="前缀 CAT_，全局唯一">
                  <Input disabled={!!editingId} placeholder="CAT_" />
                </Form.Item>
                <Form.Item name="categoryName" label="类目名称" rules={[{ required: true, message: '请输入类目名称' }]}>
                  <Input />
                </Form.Item>
              </div>
              <Form.Item name="description" label="说明">
                <Input.TextArea rows={3} />
              </Form.Item>
            </Form>
          </div>

          {/* 标签迁移（编辑模式显示当前类目标签，新建模式可从其他类目选标签） */}
          {(editingId && editingRecord) ? (
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <SwapOutlined style={{ color: '#0ea5e9' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.92)' }}>标签迁移</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>将当前类目的标签迁移到其他类目</span>
              </div>

              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                {/* 源：当前类目（锁定） */}
                <div style={{ flex: 1 }}>
                  <Select
                    value={editingRecord.id}
                    disabled
                    style={{ width: '100%', marginBottom: 8 }}
                    options={[{ label: `${editingRecord.categoryName}（当前）`, value: editingRecord.id }]}
                  />
                  <Input placeholder="筛选标签" prefix={<SearchOutlined />} size="small" value={migLeftFilter}
                    onChange={e => setMigLeftFilter(e.target.value)} allowClear style={{ marginBottom: 8 }} />
                  <Table rowKey="id" columns={smallTagColumns} dataSource={migLeftFiltered} size="small" pagination={false}
                    rowSelection={{ selectedRowKeys: migLeftSelected, onChange: (keys) => setMigLeftSelected(keys as number[]) }}
                    scroll={{ y: 200 }} locale={{ emptyText: '暂无标签' }} />
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
                    共 {migLeftTags.length} 个，已选 {migLeftSelected.length} 个
                  </div>
                </div>

                {/* 迁移按钮 - 双向 */}
                <div style={{ paddingTop: 60, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Button
                    type="primary"
                    icon={<SwapRightOutlined />}
                    onClick={handleMigrate}
                    disabled={migLeftSelected.length === 0 || !migTargetCatId}
                    size="small"
                    style={{ borderRadius: 6 }}
                  />
                  <Button
                    type="primary"
                    icon={<SwapRightOutlined style={{ transform: 'rotate(180deg)' }} />}
                    onClick={handleMigrateBack}
                    disabled={migRightSelected.length === 0}
                    size="small"
                    style={{ borderRadius: 6 }}
                  />
                </div>

                {/* 目标类目 */}
                <div style={{ flex: 1 }}>
                  <Select
                    placeholder="选择目标类目"
                    value={migTargetCatId}
                    onChange={handleMigTargetChange}
                    style={{ width: '100%', marginBottom: 8 }}
                    options={allCategories
                      .filter(c => c.id !== editingRecord.id)
                      .map(c => ({ label: `${c.categoryName}（${c.categoryCode}）`, value: c.id }))}
                  />
                  <Input placeholder="筛选标签" prefix={<SearchOutlined />} size="small" value={migRightFilter}
                    onChange={e => setMigRightFilter(e.target.value)} allowClear style={{ marginBottom: 8 }} />
                  <Table rowKey="id" columns={smallTagColumns} dataSource={migRightFiltered} size="small" pagination={false}
                    rowSelection={{ selectedRowKeys: migRightSelected, onChange: (keys) => setMigRightSelected(keys as number[]) }}
                    scroll={{ y: 200 }} locale={{ emptyText: migTargetCatId ? '暂无标签' : '请选择目标类目' }} />
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
                    共 {migRightTags.length} 个，已选 {migRightSelected.length} 个
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <TagsOutlined style={{ color: '#0ea5e9' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.92)' }}>选择标签</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>从其他类目选择标签迁入新类目（可选，创建后执行）</span>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <Select
                    placeholder="选择来源类目"
                    value={migTargetCatId}
                    onChange={handleMigTargetChange}
                    style={{ width: '100%', marginBottom: 8 }}
                    options={allCategories.map(c => ({ label: `${c.categoryName}（${c.categoryCode}）`, value: c.id }))}
                  />
                  <Input placeholder="筛选标签" prefix={<SearchOutlined />} size="small" value={migRightFilter}
                    onChange={e => setMigRightFilter(e.target.value)} allowClear style={{ marginBottom: 8 }} />
                  <Table rowKey="id" columns={smallTagColumns} dataSource={migRightFiltered} size="small" pagination={false}
                    rowSelection={{ selectedRowKeys: migLeftSelected, onChange: (keys) => setMigLeftSelected(keys as number[]) }}
                    scroll={{ y: 200 }} locale={{ emptyText: migTargetCatId ? '暂无标签' : '请选择来源类目' }} />
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
                    共 {migRightTags.length} 个，已选 {migLeftSelected.length} 个
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* 标签列表弹窗 */}
      <Modal
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'linear-gradient(135deg, #0ea5e9, #8b5cf6)', display: 'inline-block', boxShadow: '0 0 8px rgba(14, 165, 233, 0.4)' }} />
            {tagModalTitle} · 标签列表
            {!tagLoading && <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: 400, marginLeft: 4 }}>共 {tagTotal} 个</span>}
          </span>
        }
        open={tagModalOpen}
        onCancel={() => setTagModalOpen(false)}
        footer={null}
        width={700}
        maskClosable={false}
        destroyOnClose
      >
        <Table rowKey="id" columns={viewTagColumns} dataSource={tagData} loading={tagLoading} size="small"
          pagination={{
            current: tagPage, total: tagTotal, pageSize: 10,
            onChange: (p) => { setTagPage(p); if (tagModalCatId) openTagModal({ categoryName: tagModalTitle, id: tagModalCatId }, p); },
            showTotal: (t) => `共 ${t} 个标签`,
          }}
          locale={{ emptyText: '该类目下暂无标签' }} />
      </Modal>

      {/* 类目详情弹窗 */}
      <Modal title="类目详情" open={detailOpen} onCancel={() => setDetailOpen(false)} maskClosable={false}
        footer={<Space><Button onClick={() => { setDetailOpen(false); if (detailRecord) openEdit(detailRecord); }}>编辑</Button><Button onClick={() => setDetailOpen(false)}>关闭</Button></Space>}
        destroyOnClose>
        {detailRecord && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}>
            <div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>类目名称</div>
              <div style={{ fontWeight: 600, color: 'rgba(255,255,255,0.92)' }}>{detailRecord.categoryName}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>类目编码</div>
              <div style={{ fontWeight: 600, color: 'rgba(255,255,255,0.92)', fontFamily: "'JetBrains Mono', monospace" }}>{detailRecord.categoryCode}</div>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>说明</div>
              <div style={{ color: 'rgba(255,255,255,0.92)' }}>{detailRecord.description || '-'}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>状态</div>
              <Tag color={detailRecord.status === 'ACTIVE' ? 'green' : 'default'}>{detailRecord.status === 'ACTIVE' ? '启用' : '停用'}</Tag>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>标签数量</div>
              <a className="action-link" onClick={() => { setDetailOpen(false); openTagModal(detailRecord); }}>{detailRecord.tagCount ?? 0} 个标签</a>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>创建时间</div>
              <div style={{ color: 'rgba(255,255,255,0.92)' }}>{detailRecord.createdAt || '-'}</div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
