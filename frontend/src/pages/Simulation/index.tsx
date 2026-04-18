import { useEffect, useState } from 'react';
import { Button, Table, Space, Tag, message, Input, Modal, Form, Select, Popconfirm, Drawer } from 'antd';
import { PlusOutlined, SearchOutlined, DeleteOutlined, ExportOutlined, CopyOutlined } from '@ant-design/icons';
import { taskApi, ruleApi } from '@/services/api';
import RulePickerModal from '@/components/RulePickerModal';
import ScopeSelector from '@/components/ScopeSelector';

const { Option } = Select;

const statusMap: Record<string, { text: string; color: string }> = {
  INIT: { text: '待运行', color: 'default' },
  RUNNING: { text: '运行中', color: 'processing' },
  SUCCESS: { text: '运行成功', color: 'success' },
  FAILED: { text: '运行失败', color: 'error' },
};

/** 规则明细弹窗的筛选类型 */
type RuleFilter = 'all' | 'success' | 'failed';

export default function SimulationPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [filterTaskStatus, setFilterTaskStatus] = useState<string>();
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form] = Form.useForm();
  const [rulePickerOpen, setRulePickerOpen] = useState(false);
  const [selectedRuleIds, setSelectedRuleIds] = useState<number[]>([]);
  const [selectedRuleNames, setSelectedRuleNames] = useState<string[]>([]);
  const [scope, setScope] = useState<{ type: 'FULL' | 'CUSTOM'; orgIds: number[]; employeeIds: number[] }>({ type: 'FULL', orgIds: [], employeeIds: [] });

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRecord, setDetailRecord] = useState<any>(null);

  const [resultOpen, setResultOpen] = useState(false);
  const [resultTask, setResultTask] = useState<any>(null);

  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [evidenceData, setEvidenceData] = useState<any>(null);

  // 规则明细弹窗
  const [ruleDetailOpen, setRuleDetailOpen] = useState(false);
  const [ruleDetailFilter, setRuleDetailFilter] = useState<RuleFilter>('all');
  const [ruleDetailTask, setRuleDetailTask] = useState<any>(null);
  const [ruleDetailData, setRuleDetailData] = useState<any[]>([]);
  const [ruleDetailLoading, setRuleDetailLoading] = useState(false);

  const fetchData = async (page = current, size = pageSize) => {
    setLoading(true);
    try {
      const res: any = await taskApi.page({ current: page, size, keyword, taskMode: 'SIMULATION', taskStatus: filterTaskStatus });
      setData(res.data.records);
      setTotal(res.data.total);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(1); }, []);

  const openCreateForm = () => {
    setEditingId(null);
    form.resetFields();
    form.setFieldsValue({ taskName: '模拟打标-' + new Date().toLocaleDateString() });
    setSelectedRuleIds([]);
    setSelectedRuleNames([]);
    setFormOpen(true);
  };

  const openEditForm = (record: any) => {
    setEditingId(record.id);
    form.setFieldsValue({ taskName: record.taskName });
    setSelectedRuleIds([]);
    setSelectedRuleNames([]);
    setFormOpen(true);
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    try {
      if (editingId) {
        message.info('编辑功能待后端支持');
      } else {
        await taskApi.create({
          taskName: values.taskName, taskType: scope.type === 'FULL' ? 'FULL' : 'CUSTOM', taskMode: 'SIMULATION',
          taskScope: scope.type === 'FULL' ? null : JSON.stringify({ orgIds: scope.orgIds, employeeIds: scope.employeeIds }),
          triggeredBy: 'admin', ruleIds: selectedRuleIds,
        });
        message.success('创建成功');
      }
      setFormOpen(false); form.resetFields(); setEditingId(null); fetchData();
    } catch (e: any) { message.error(e.message); }
  };

  const handleRulePickerOk = async (ids: number[]) => {
    setSelectedRuleIds(ids);
    // 获取规则名称用于展示
    try {
      const res: any = await ruleApi.page({ current: 1, size: 100 });
      const allRules = res.data?.records || [];
      const names = ids.map(id => allRules.find((r: any) => r.id === id)?.ruleName || `规则#${id}`);
      setSelectedRuleNames(names);
    } catch { setSelectedRuleNames(ids.map(id => `规则#${id}`)); }
    setRulePickerOpen(false);
  };

  const handleRun = async (record: any) => {
    try { await taskApi.run(record.id); message.success('已开始运行'); fetchData(); }
    catch (e: any) { message.error(e.message); }
  };

  const handleCopy = async (record: any) => {
    try {
      await taskApi.create({ taskName: record.taskName + '(副本)', taskType: record.taskType || 'FULL', taskMode: 'SIMULATION', triggeredBy: 'admin', ruleIds: [] });
      message.success('复制成功'); fetchData();
    } catch (e: any) { message.error(e.message); }
  };

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) { message.warning('请先选择要删除的方案'); return; }
    for (const id of selectedRowKeys) { try { await taskApi.delete(id); } catch {} }
    message.success('批量删除成功'); setSelectedRowKeys([]); fetchData();
  };

  const openResult = (record: any) => { setResultTask(record); setResultOpen(true); };
  const openDetail = (record: any) => { setDetailRecord(record); setDetailOpen(true); };
  const openEvidence = (row: any) => { setEvidenceData(row); setEvidenceOpen(true); };

  /** 打开规则明细弹窗 */
  const openRuleDetail = async (record: any, filter: RuleFilter) => {
    setRuleDetailTask(record);
    setRuleDetailFilter(filter);
    setRuleDetailOpen(true);
    setRuleDetailLoading(true);
    try {
      const res: any = await taskApi.getRules(record.id);
      setRuleDetailData(res.data || []);
    } catch {
      setRuleDetailData([]);
    }
    setRuleDetailLoading(false);
  };

  /** 根据筛选类型过滤规则 */
  const filteredRuleData = ruleDetailData.filter(r => {
    if (ruleDetailFilter === 'success') return r.status === 'SUCCESS';
    if (ruleDetailFilter === 'failed') return r.status === 'FAILED';
    return true;
  });

  const ruleDetailColumns = [
    { title: '规则名称', dataIndex: 'ruleName', width: 180 },
    { title: '规则编码', dataIndex: 'ruleCode', width: 150, render: (v: string) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v}</span> },
    { title: '规则类型', dataIndex: 'ruleType', width: 100, render: (v: string) => <Tag color={v === 'STRUCTURED' ? 'blue' : 'purple'}>{v === 'STRUCTURED' ? '结构化' : 'AI语义'}</Tag> },
    { title: '执行状态', dataIndex: 'status', width: 100, render: (s: string) => <Tag color={s === 'SUCCESS' ? 'success' : s === 'FAILED' ? 'error' : 'default'}>{s === 'SUCCESS' ? '成功' : s === 'FAILED' ? '失败' : s}</Tag> },
    { title: '命中人数', dataIndex: 'hitCount', width: 90 },
    { title: '错误信息', dataIndex: 'errorMessage', ellipsis: true, render: (v: string) => v || '-' },
  ];

  /** 可点击的数字单元格 */
  const CountCell = ({ value, record, filter, color }: { value: number; record: any; filter: RuleFilter; color: string }) => (
    <a onClick={() => openRuleDetail(record, filter)}
       style={{ color, fontWeight: 600, cursor: 'pointer', borderBottom: `1px dashed ${color}` }}>
      {value ?? 0}
    </a>
  );

  const resultColumns = [
    { title: '员工姓名', dataIndex: 'employeeName', width: 100 },
    { title: '工号', dataIndex: 'employeeNo', width: 100 },
    { title: '部门', dataIndex: 'orgName', width: 120 },
    { title: '当前标签', dataIndex: 'currentTags', width: 180, render: (tags: string[]) => tags?.map(t => <Tag key={t} color="blue">{t}</Tag>) || '-' },
    { title: '模拟标签', dataIndex: 'simulationTags', width: 180, render: (tags: string[]) => tags?.map(t => <Tag key={t} color="green">{t}</Tag>) || '-' },
    { title: '变化', dataIndex: 'change', width: 80, render: (v: string) => v === 'NEW' ? <Tag color="success">新增</Tag> : v === 'REMOVED' ? <Tag color="error">移除</Tag> : <Tag>不变</Tag> },
    { title: '操作', width: 80, render: (_: any, row: any) => <a className="action-link" onClick={() => openEvidence(row)}>证据</a> },
  ];

  const mockResultData = resultTask?.taskStatus === 'SUCCESS' ? [
    { key: 1, employeeName: '张明', employeeNo: 'EMP001', orgName: '技术研发部', currentTags: ['核心骨干'], simulationTags: ['核心骨干', '导师候选'], change: 'NEW' },
    { key: 2, employeeName: '王强', employeeNo: 'EMP003', orgName: '产品设计部', currentTags: ['核心骨干'], simulationTags: ['核心骨干'], change: 'SAME' },
    { key: 3, employeeName: '陈磊', employeeNo: 'EMP005', orgName: '技术研发部', currentTags: ['核心骨干'], simulationTags: ['核心骨干', '导师候选'], change: 'NEW' },
    { key: 4, employeeName: '李婷', employeeNo: 'EMP002', orgName: '技术研发部', currentTags: [], simulationTags: [], change: 'SAME' },
  ] : [];

  const columns = [
    { title: '方案名称', dataIndex: 'taskName', width: 200, render: (name: string, record: any) => <a className="action-link" style={{ fontWeight: 500 }} onClick={() => openDetail(record)}>{name}</a> },
    { title: '任务编号', dataIndex: 'taskNo', width: 150 },
    { title: '状态', dataIndex: 'taskStatus', width: 110, render: (s: string) => <Tag color={statusMap[s]?.color}>{statusMap[s]?.text}</Tag> },
    { title: '总数', dataIndex: 'totalCount', width: 70, render: (v: number, r: any) => <CountCell value={v} record={r} filter="all" color="#22d3ee" /> },
    { title: '成功', dataIndex: 'successCount', width: 70, render: (v: number, r: any) => <CountCell value={v} record={r} filter="success" color="#10b981" /> },
    { title: '失败', dataIndex: 'failCount', width: 70, render: (v: number, r: any) => <CountCell value={v} record={r} filter="failed" color="#ef4444" /> },
    { title: '创建时间', dataIndex: 'createdAt', width: 170 },
    {
      title: '操作', width: 280,
      render: (_: any, record: any) => (
        <Space>
          {(record.taskStatus === 'INIT' || record.taskStatus === 'FAILED') && <a className="action-link action-link-success" onClick={() => handleRun(record)}>运行</a>}
          {(record.taskStatus === 'INIT' || record.taskStatus === 'FAILED') && <a className="action-link" onClick={() => openEditForm(record)}>编辑</a>}
          {record.taskStatus === 'SUCCESS' && <a className="action-link" onClick={() => openResult(record)}>查看结果</a>}
          <a className="action-link" onClick={() => handleCopy(record)}>复制</a>
          <a className="action-link action-link-danger" onClick={async () => { try { await taskApi.delete(record.id); message.success('已删除'); fetchData(); } catch (e: any) { message.error(e.message || '删除失败'); } }}>删除</a>
        </Space>
      ),
    },
  ];

  return (
    <div className="page-container">
      <div className="page-toolbar">
        <Space>
          <Input placeholder="搜索方案名称、编号" value={keyword} onChange={e => setKeyword(e.target.value)} onPressEnter={() => fetchData(1)} prefix={<SearchOutlined />} style={{ width: 240 }} />
          <Select placeholder="运行状态" allowClear style={{ width: 120 }} value={filterTaskStatus} onChange={v => setFilterTaskStatus(v)}>
            <Option value="INIT">待运行</Option><Option value="RUNNING">运行中</Option><Option value="SUCCESS">运行成功</Option><Option value="FAILED">运行失败</Option>
          </Select>
          <Button onClick={() => fetchData(1)}>查询</Button>
          <Button onClick={() => { setKeyword(''); setFilterTaskStatus(undefined); fetchData(1); }}>重置</Button>
        </Space>
        <Space>
          <Button icon={<DeleteOutlined />} disabled={selectedRowKeys.length === 0} onClick={handleBatchDelete}>批量删除</Button>
          <Button icon={<ExportOutlined />}>批量导出</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateForm}>新建</Button>
        </Space>
      </div>
      <Table rowKey="id" columns={columns} dataSource={data} loading={loading}
        rowSelection={{ selectedRowKeys, onChange: keys => setSelectedRowKeys(keys as number[]) }}
        pagination={{ current, total, pageSize, showTotal: t => `共 ${t} 条`, showSizeChanger: true, onChange: (p, s) => { setCurrent(p); setPageSize(s); fetchData(p, s); } }} />

      {/* 新建/编辑弹窗 */}
      <Modal title={editingId ? '编辑模拟方案' : '新建模拟方案'} open={formOpen} width={860} maskClosable={false}
             onOk={handleSave} onCancel={() => { setFormOpen(false); form.resetFields(); setEditingId(null); }}>
        <Form form={form} layout="vertical">
          <Form.Item name="taskName" label="方案名称" rules={[{ required: true }]}><Input placeholder="输入方案名称" /></Form.Item>
          <Form.Item label="打标范围">
            <ScopeSelector value={scope} onChange={setScope} />
          </Form.Item>
          <Form.Item label="选择规则">
            <div>
              <Button onClick={() => setRulePickerOpen(true)} style={{ marginBottom: 8 }}>
                选择规则（已选 {selectedRuleIds.length} 条）
              </Button>
              {selectedRuleNames.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {selectedRuleNames.map((name, i) => (
                    <Tag key={i} closable onClose={() => {
                      const newIds = selectedRuleIds.filter((_, idx) => idx !== i);
                      const newNames = selectedRuleNames.filter((_, idx) => idx !== i);
                      setSelectedRuleIds(newIds);
                      setSelectedRuleNames(newNames);
                    }}>{name}</Tag>
                  ))}
                </div>
              )}
            </div>
          </Form.Item>
        </Form>
      </Modal>

      <RulePickerModal open={rulePickerOpen} value={selectedRuleIds}
                       onOk={handleRulePickerOk} onCancel={() => setRulePickerOpen(false)} />

      {/* 详情弹窗 */}
      <Modal title="模拟方案详情" open={detailOpen} onCancel={() => setDetailOpen(false)} footer={<Button onClick={() => setDetailOpen(false)}>关闭</Button>} width={500} maskClosable={false} destroyOnClose>
        {detailRecord && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}>
            <div><div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>方案名称</div><div style={{ fontWeight: 600, color: 'rgba(255,255,255,0.92)' }}>{detailRecord.taskName}</div></div>
            <div><div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>任务编号</div><div style={{ fontWeight: 600, color: 'rgba(255,255,255,0.92)', fontFamily: "'JetBrains Mono', monospace" }}>{detailRecord.taskNo}</div></div>
            <div><div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>状态</div><Tag color={statusMap[detailRecord.taskStatus]?.color}>{statusMap[detailRecord.taskStatus]?.text}</Tag></div>
            <div><div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>创建时间</div><div style={{ color: 'rgba(255,255,255,0.92)' }}>{detailRecord.createdAt || '-'}</div></div>
            <div><div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>总数 / 成功 / 失败</div><div style={{ color: 'rgba(255,255,255,0.92)' }}>{detailRecord.totalCount ?? 0} / {detailRecord.successCount ?? 0} / {detailRecord.failCount ?? 0}</div></div>
          </div>
        )}
      </Modal>

      {/* 规则明细弹窗 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span>规则执行明细 — {ruleDetailTask?.taskName}</span>
            <Tag color={ruleDetailFilter === 'all' ? 'cyan' : ruleDetailFilter === 'success' ? 'success' : 'error'}>
              {ruleDetailFilter === 'all' ? '全部' : ruleDetailFilter === 'success' ? '成功' : '失败'}
            </Tag>
          </div>
        }
        open={ruleDetailOpen}
        onCancel={() => setRuleDetailOpen(false)}
        footer={<Button onClick={() => setRuleDetailOpen(false)}>关闭</Button>}
        width={800}
        maskClosable={false}
        destroyOnClose
      >
        <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
          {(['all', 'success', 'failed'] as RuleFilter[]).map(f => (
            <Tag key={f} color={ruleDetailFilter === f ? (f === 'all' ? 'cyan' : f === 'success' ? 'success' : 'error') : 'default'}
                 style={{ cursor: 'pointer' }} onClick={() => setRuleDetailFilter(f)}>
              {f === 'all' ? `全部 (${ruleDetailData.length})` : f === 'success' ? `成功 (${ruleDetailData.filter(r => r.status === 'SUCCESS').length})` : `失败 (${ruleDetailData.filter(r => r.status === 'FAILED').length})`}
            </Tag>
          ))}
        </div>
        <Table columns={ruleDetailColumns} dataSource={filteredRuleData} rowKey="ruleId" loading={ruleDetailLoading}
               pagination={false} size="small" scroll={{ y: 400 }} />
      </Modal>

      {/* 结果对比抽屉 */}
      <Drawer title={`模拟结果对比 — ${resultTask?.taskName || ''}`} open={resultOpen} width={900} onClose={() => setResultOpen(false)} destroyOnClose>
        <div style={{ marginBottom: 16, color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>按人员展示"当前标签 vs 模拟标签"对比，点击"证据"查看命中详情</div>
        <Table columns={resultColumns} dataSource={mockResultData} pagination={false} size="small" />
      </Drawer>

      {/* 证据下钻弹窗 */}
      <Modal title="打标证据详情" open={evidenceOpen} onCancel={() => setEvidenceOpen(false)} footer={<Button onClick={() => setEvidenceOpen(false)}>关闭</Button>} width={600} maskClosable={false} destroyOnClose>
        {evidenceData && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px', marginBottom: 16 }}>
              <div><div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>员工</div><div style={{ fontWeight: 600, color: 'rgba(255,255,255,0.92)' }}>{evidenceData.employeeName} ({evidenceData.employeeNo})</div></div>
              <div><div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>部门</div><div style={{ color: 'rgba(255,255,255,0.92)' }}>{evidenceData.orgName}</div></div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 16, border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontWeight: 600, marginBottom: 12, color: 'rgba(255,255,255,0.85)' }}>命中证据</div>
              <div style={{ display: 'grid', gap: 8 }}>
                <div><span style={{ color: 'rgba(255,255,255,0.4)' }}>来源规则：</span><span style={{ color: 'rgba(255,255,255,0.85)' }}>核心骨干识别规则</span></div>
                <div><span style={{ color: 'rgba(255,255,255,0.4)' }}>命中条件：</span><span style={{ color: 'rgba(255,255,255,0.85)' }}>hire_date ≤ 2023-04-15</span></div>
                <div><span style={{ color: 'rgba(255,255,255,0.4)' }}>实际值：</span><span style={{ color: 'rgba(255,255,255,0.85)' }}>2018-06-01</span></div>
                <div><span style={{ color: 'rgba(255,255,255,0.4)' }}>适用范围：</span><Tag color="blue">全公司</Tag></div>
                <div><span style={{ color: 'rgba(255,255,255,0.4)' }}>判定结果：</span><Tag color="success">命中</Tag></div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
