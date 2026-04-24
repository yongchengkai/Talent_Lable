import { useEffect, useState } from 'react';
import { Button, Table, Space, Tag, message, Input, Modal, Select, Drawer } from 'antd';
import { PlusOutlined, SearchOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { taskApi } from '@/services/api';
import ActionLink from '@/components/ActionLink';
import CreateModal from './CreateModal';
import EditModal from './EditModal';
import ViewModal from './ViewModal';

const { Option } = Select;

const statusMap: Record<string, { text: string; color: string }> = {
  INIT: { text: '待运行', color: 'default' },
  RUNNING: { text: '运行中', color: 'processing' },
  SUCCESS: { text: '运行成功', color: 'success' },
  FAILED: { text: '运行失败', color: 'error' },
};

type RuleFilter = 'all' | 'success' | 'failed';

export default function SimulationPage({ embedded, embeddedFilters, embeddedPrefill, embeddedAction, onNavigate }: { embedded?: boolean; embeddedFilters?: Record<string, string>; embeddedPrefill?: Record<string, any>; embeddedAction?: string; onNavigate?: (page: string, filters?: Record<string, string>) => void } = {}) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState(embeddedFilters?.keyword || '');
  const [filterTaskStatus, setFilterTaskStatus] = useState<string | undefined>(embeddedFilters?.taskStatus);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<any>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewRecord, setViewRecord] = useState<any>(null);

  const [resultOpen, setResultOpen] = useState(false);
  const [resultTask, setResultTask] = useState<any>(null);
  const [resultData, setResultData] = useState<any[]>([]);
  const [resultLoading, setResultLoading] = useState(false);

  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [evidenceData, setEvidenceData] = useState<any>(null);

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

  const isEmbeddedCreate = embedded && embeddedAction === 'create';
  const isEmbeddedEdit = embedded && embeddedAction === 'edit';

  useEffect(() => {
    if (isEmbeddedCreate) setCreateOpen(false);
  }, [isEmbeddedCreate]);
  const handleRun = async (record: any) => {
    try {
      await taskApi.run(record.id);
      message.success('已开始运行');
      fetchData();
      const poll = setInterval(async () => {
        try {
          const res: any = await taskApi.getById(record.id);
          if (res.data?.taskStatus !== 'RUNNING') { clearInterval(poll); fetchData(); }
        } catch { clearInterval(poll); }
      }, 2000);
    } catch (e: any) { message.error(e.message); }
  };

  const handleCopy = async (record: any) => {
    try {
      await taskApi.create({ taskName: record.taskName + '(副本)', taskType: record.taskType || 'FULL', taskMode: 'SIMULATION', triggeredBy: 'admin', ruleIds: [] });
      message.success('复制成功'); fetchData();
    } catch (e: any) { message.error(e.message); }
  };

  const openResult = async (record: any) => {
    setResultTask(record); setResultOpen(true); setResultLoading(true);
    try { const res: any = await taskApi.getResults(record.id); setResultData(res.data || []); }
    catch { setResultData([]); }
    setResultLoading(false);
  };

  const openRuleDetail = async (record: any, filter: RuleFilter) => {
    setRuleDetailTask(record); setRuleDetailFilter(filter); setRuleDetailOpen(true); setRuleDetailLoading(true);
    try { const res: any = await taskApi.getRules(record.id); setRuleDetailData(res.data || []); }
    catch { setRuleDetailData([]); }
    setRuleDetailLoading(false);
  };

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

  const CountCell = ({ value, record, filter, color }: { value: number; record: any; filter: RuleFilter; color: string }) => (
    <a onClick={() => openRuleDetail(record, filter)} style={{ color, fontWeight: 600, cursor: 'pointer', borderBottom: `1px dashed ${color}` }}>{value ?? 0}</a>
  );

  const resultColumns = [
    { title: '员工姓名', dataIndex: 'employeeName', width: 100 },
    { title: '工号', dataIndex: 'employeeNo', width: 100 },
    { title: '部门', dataIndex: 'orgName', width: 120 },
    { title: '职级', dataIndex: 'gradeLevel', width: 70 },
    { title: '命中标签', dataIndex: 'hitTags', width: 200, render: (tags: string[]) => tags?.length > 0 ? tags.map(t => <Tag key={t} color="green">{t}</Tag>) : <span style={{ color: 'rgba(255,255,255,0.2)' }}>无</span> },
    { title: '命中数', dataIndex: 'hitCount', width: 70, render: (v: number) => <span style={{ fontWeight: 600, color: v > 0 ? '#10b981' : 'rgba(255,255,255,0.2)' }}>{v}</span> },
  ];

  const columns = [
    { title: '方案名称', dataIndex: 'taskName', width: 200, render: (name: string, record: any) => embedded ? <span style={{ fontWeight: 500 }}>{name}</span> : <a className="action-link" style={{ fontWeight: 500 }} onClick={() => { setViewRecord(record); setViewOpen(true); }}>{name}</a> },
    { title: '任务编号', dataIndex: 'taskNo', width: 150 },
    { title: '状态', dataIndex: 'taskStatus', width: 110, render: (s: string, record: any) => {
      if (s === 'RUNNING') return <Tag icon={<span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#1890ff', marginRight: 6, animation: 'pulse 1.5s infinite' }} />} color="processing">运行中</Tag>;
      if (s === 'FAILED' && record.errorMessage) return <Tag color="error" style={{ cursor: 'pointer' }} onClick={() => { Modal.error({ title: '运行失败', content: record.errorMessage, width: 500 }); }}>运行失败</Tag>;
      return <Tag color={statusMap[s]?.color}>{statusMap[s]?.text}</Tag>;
    }},
    { title: '总数', dataIndex: 'totalCount', width: 70, render: (v: number, r: any) => r.taskStatus === 'INIT' ? <span style={{ color: '#22d3ee', fontWeight: 600 }}>{v ?? 0}</span> : <CountCell value={v} record={r} filter="all" color="#22d3ee" /> },
    { title: '成功', dataIndex: 'successCount', width: 70, render: (v: number, r: any) => r.taskStatus === 'INIT' ? <span style={{ color: 'rgba(255,255,255,0.2)' }}>-</span> : <CountCell value={v} record={r} filter="success" color="#10b981" /> },
    { title: '失败', dataIndex: 'failCount', width: 70, render: (v: number, r: any) => r.taskStatus === 'INIT' ? <span style={{ color: 'rgba(255,255,255,0.2)' }}>-</span> : <CountCell value={v} record={r} filter="failed" color="#ef4444" /> },
    { title: '创建时间', dataIndex: 'createdAt', width: 170 },
    ...(!embedded ? [{
      title: '操作', width: 280,
      render: (_: any, record: any) => (
        <Space>
          <ActionLink success
            disabled={record.taskStatus === 'RUNNING'}
            disabledReason="任务正在运行中"
            onClick={() => handleRun(record)}>
            {record.taskStatus === 'SUCCESS' ? '重新运行' : '运行'}
          </ActionLink>
          <ActionLink
            disabled={record.taskStatus === 'RUNNING' || record.taskStatus === 'SUCCESS'}
            disabledReason={record.taskStatus === 'RUNNING' ? '运行中不可编辑' : '运行成功的任务需先撤销后才能编辑'}
            onClick={() => { setEditRecord(record); setEditOpen(true); }}>
            编辑
          </ActionLink>
          <ActionLink
            disabled={record.taskStatus !== 'SUCCESS'}
            disabledReason="仅运行成功的任务可查看结果"
            onClick={() => openResult(record)}>
            查看结果
          </ActionLink>
          <ActionLink danger
            disabled={record.taskStatus !== 'SUCCESS'}
            disabledReason="仅运行成功的任务可撤销"
            onClick={() => {
              Modal.confirm({ title: '确认撤销', icon: <ExclamationCircleOutlined style={{ color: '#0ea5e9' }} />, content: '撤销后任务将回到未运行状态，打标结果将被清除。确认撤销？', okText: '确认撤销', cancelText: '取消', okButtonProps: { danger: true },
                onOk: async () => { try { await taskApi.revoke(record.id); message.success('已撤销'); fetchData(); } catch (e: any) { message.error(e.message || '撤销失败'); } } });
            }}>
            撤销
          </ActionLink>
          <ActionLink onClick={() => handleCopy(record)}>复制</ActionLink>
          <ActionLink danger
            disabled={record.taskStatus === 'RUNNING' || record.taskStatus === 'SUCCESS'}
            disabledReason={record.taskStatus === 'RUNNING' ? '运行中不可删除' : '请先撤销后再删除'}
            onClick={() => {
              Modal.confirm({ title: '确认删除', icon: <ExclamationCircleOutlined style={{ color: '#0ea5e9' }} />, content: '删除后不可恢复，确认删除该方案？', okText: '确认删除', cancelText: '取消', okButtonProps: { danger: true },
                onOk: async () => { try { await taskApi.delete(record.id); message.success('已删除'); fetchData(); } catch (e: any) { message.error(e.message || '删除失败'); } } });
            }}>
            删除
          </ActionLink>
        </Space>
      ),
    }] : []),
  ];

  if (isEmbeddedCreate) {
    return <CreateModal open={false} onClose={() => {}} onSuccess={() => fetchData()} inline prefill={embeddedPrefill} />;
  }
  if (isEmbeddedEdit) {
    const prefill = embeddedPrefill || {};
    const embeddedRecord = {
      id: prefill.id !== undefined ? Number(prefill.id) : undefined,
      taskName: prefill.taskName || prefill.name || '',
      taskType: prefill.taskType || prefill.scopeType || 'FULL',
      taskScope: prefill.taskScope || (prefill.orgIds || prefill.employeeIds ? { orgIds: prefill.orgIds || [], employeeIds: prefill.employeeIds || [] } : null),
      ruleIds: prefill.ruleIds,
      ruleNames: prefill.ruleNames,
    };
    return <EditModal open={false} record={embeddedRecord} onClose={() => {}} onSuccess={() => fetchData()} inline />;
  }

  return (
    <div className={embedded ? undefined : "page-container"} style={embedded ? { width: '100%', maxWidth: '100%', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden', margin: '8px 0' } : undefined}>
      <div className={embedded ? undefined : "page-toolbar"} style={embedded ? { padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.04)' } : undefined}>
        <Space size={embedded ? 6 : 8} wrap={embedded}>
          <Input placeholder="搜索方案名称、编号" value={keyword} onChange={e => setKeyword(e.target.value)} onPressEnter={() => fetchData(1)} prefix={<SearchOutlined />} size={embedded ? 'small' : 'middle'} style={{ width: embedded ? 180 : 240, fontSize: embedded ? 12 : undefined }} />
          <Select placeholder="运行状态" allowClear size={embedded ? 'small' : 'middle'} style={{ width: embedded ? 90 : 120, fontSize: embedded ? 12 : undefined }} value={filterTaskStatus} onChange={v => setFilterTaskStatus(v)}>
            <Option value="INIT">待运行</Option><Option value="RUNNING">运行中</Option><Option value="SUCCESS">运行成功</Option><Option value="FAILED">运行失败</Option>
          </Select>
          <Button size={embedded ? 'small' : 'middle'} onClick={() => fetchData(1)} style={embedded ? { fontSize: 12 } : undefined}>查询</Button>
          <Button size={embedded ? 'small' : 'middle'} onClick={() => { setKeyword(''); setFilterTaskStatus(undefined); fetchData(1); }} style={embedded ? { fontSize: 12 } : undefined}>重置</Button>
        </Space>
        {!embedded && <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>新建</Button>}
      </div>

      <Table rowKey="id" columns={columns} dataSource={data} loading={loading}
        size={embedded ? 'small' : undefined}
        scroll={embedded ? { x: 900 } : undefined}
        style={embedded ? { fontSize: 12 } : undefined}
        pagination={{ current, total, pageSize: embedded ? 10 : pageSize, showTotal: t => `共 ${t} 条`, showSizeChanger: true, showQuickJumper: !embedded, pageSizeOptions: embedded ? ['5', '10', '20'] : ['10', '20', '50', '100'], size: embedded ? 'small' : undefined, onChange: (p, s) => { setCurrent(p); setPageSize(s); fetchData(p, s); } }} />

      {embedded && (
        <div style={{ padding: '4px 12px', borderTop: '1px solid rgba(255,255,255,0.04)', textAlign: 'right' }}>
          <Button type="link" size="small" style={{ fontSize: 12, padding: 0 }} onClick={() => onNavigate?.('/app/tasks/simulation')}>
            在页面中查看 →
          </Button>
        </div>
      )}

      <CreateModal open={createOpen} onClose={() => setCreateOpen(false)} onSuccess={() => fetchData()} />
      <EditModal open={editOpen} record={editRecord} onClose={() => { setEditOpen(false); setEditRecord(null); }} onSuccess={() => fetchData()} />
      <ViewModal open={viewOpen} record={viewRecord} onClose={() => { setViewOpen(false); setViewRecord(null); }} />

      {/* 规则明细弹窗 */}
      <Modal
        title={<div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><span>规则执行明细 — {ruleDetailTask?.taskName}</span><Tag color={ruleDetailFilter === 'all' ? 'cyan' : ruleDetailFilter === 'success' ? 'success' : 'error'}>{ruleDetailFilter === 'all' ? '全部' : ruleDetailFilter === 'success' ? '成功' : '失败'}</Tag></div>}
        open={ruleDetailOpen} onCancel={() => setRuleDetailOpen(false)}
        footer={<Button onClick={() => setRuleDetailOpen(false)}>关闭</Button>}
        width={800} maskClosable={false} destroyOnClose>
        <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
          {(['all', 'success', 'failed'] as RuleFilter[]).map(f => (
            <Tag key={f} color={ruleDetailFilter === f ? (f === 'all' ? 'cyan' : f === 'success' ? 'success' : 'error') : 'default'}
                 style={{ cursor: 'pointer' }} onClick={() => setRuleDetailFilter(f)}>
              {f === 'all' ? `全部 (${ruleDetailData.length})` : f === 'success' ? `成功 (${ruleDetailData.filter(r => r.status === 'SUCCESS').length})` : `失败 (${ruleDetailData.filter(r => r.status === 'FAILED').length})`}
            </Tag>
          ))}
        </div>
        <Table columns={ruleDetailColumns} dataSource={filteredRuleData} rowKey="ruleId" loading={ruleDetailLoading} pagination={false} size="small" scroll={{ y: 400 }} />
      </Modal>

      {/* 结果抽屉 */}
      <Drawer title={`模拟结果 — ${resultTask?.taskName || ''}`} open={resultOpen} width={900} onClose={() => setResultOpen(false)} destroyOnClose>
        <div style={{ marginBottom: 16, color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
          共 {resultData.length} 名员工参与打标，{resultData.filter(r => r.hitCount > 0).length} 人命中标签
        </div>
        <Table columns={resultColumns} dataSource={resultData} rowKey="employeeId" loading={resultLoading} pagination={{ pageSize: 20, showTotal: t => `共 ${t} 人` }} size="small" />
      </Drawer>

      {/* 证据弹窗 */}
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
