import { useEffect, useState } from 'react';
import { Button, Table, Space, Tag, message, Input, Modal, Select, Popconfirm, Drawer } from 'antd';
import { PlusOutlined, SearchOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { taskApi } from '@/services/api';
import ActionLink from '@/components/ActionLink';
import CreateModal from './CreateModal';
import EditModal from './EditModal';
import ViewModal from './ViewModal';

const { Option } = Select;

const taskStatusMap: Record<string, { text: string; color: string }> = {
  INIT: { text: '待运行', color: 'default' },
  RUNNING: { text: '运行中', color: 'processing' },
  SUCCESS: { text: '运行成功', color: 'success' },
  FAILED: { text: '运行失败', color: 'error' },
};
const submitStatusMap: Record<string, { text: string; color: string }> = {
  PENDING: { text: '待提交', color: 'default' },
  SUBMITTED: { text: '已提交', color: 'processing' },
  APPROVED: { text: '已审批', color: 'success' },
  REJECTED: { text: '已驳回', color: 'error' },
};

type RuleFilter = 'all' | 'success' | 'failed';

export default function FormalTaskPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [filterTaskStatus, setFilterTaskStatus] = useState<string>();
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);

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
      const res: any = await taskApi.page({ current: page, size, keyword, taskMode: 'FORMAL', taskStatus: filterTaskStatus });
      setData(res.data.records);
      setTotal(res.data.total);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(1); }, []);

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

  const handleSubmit = async (record: any) => {
    try { await taskApi.submit(record.id); message.success('已提交入库'); fetchData(); }
    catch (e: any) { message.error(e.message || '提交失败'); }
  };

  const handleRevoke = async (record: any) => {
    try { await taskApi.revoke(record.id); message.success('已回撤，任务恢复到未运行状态'); fetchData(); }
    catch (e: any) { message.error(e.message || '回撤失败'); }
  };

  const handleBatchRetry = async () => {
    if (selectedRowKeys.length === 0) { message.warning('请先选择要重试的任务'); return; }
    const failedIds = data.filter(d => selectedRowKeys.includes(d.id) && d.taskStatus === 'FAILED').map(d => d.id);
    if (failedIds.length === 0) { message.warning('选中的任务中没有失败的任务'); return; }
    for (const id of failedIds) { try { await taskApi.run(id); } catch {} }
    message.success('已发起批量重试'); setSelectedRowKeys([]); fetchData();
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
    { title: '任务名称', dataIndex: 'taskName', width: 200, render: (name: string, record: any) => <a className="action-link" style={{ fontWeight: 500 }} onClick={() => { setViewRecord(record); setViewOpen(true); }}>{name}</a> },
    { title: '任务编号', dataIndex: 'taskNo', width: 150 },
    { title: '运行状态', dataIndex: 'taskStatus', width: 110, render: (s: string, record: any) => {
      if (s === 'RUNNING') return <Tag icon={<span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#1890ff', marginRight: 6, animation: 'pulse 1.5s infinite' }} />} color="processing">运行中</Tag>;
      if (s === 'FAILED' && record.errorMessage) return <Tag color="error" style={{ cursor: 'pointer' }} onClick={() => { Modal.error({ title: '运行失败', content: record.errorMessage, width: 500 }); }}>运行失败</Tag>;
      return <Tag color={taskStatusMap[s]?.color}>{taskStatusMap[s]?.text}</Tag>;
    }},
    { title: '提交状态', dataIndex: 'submitStatus', width: 110, render: (s: string, r: any) => r.taskStatus === 'INIT' || r.taskStatus === 'RUNNING' ? <span style={{ color: 'rgba(255,255,255,0.2)' }}>-</span> : s ? <Tag color={submitStatusMap[s]?.color}>{submitStatusMap[s]?.text}</Tag> : '-' },
    { title: '总数', dataIndex: 'totalCount', width: 70, render: (v: number, r: any) => r.taskStatus === 'INIT' ? <span style={{ color: '#22d3ee', fontWeight: 600 }}>{v ?? 0}</span> : <CountCell value={v} record={r} filter="all" color="#22d3ee" /> },
    { title: '成功', dataIndex: 'successCount', width: 70, render: (v: number, r: any) => r.taskStatus === 'INIT' ? <span style={{ color: 'rgba(255,255,255,0.2)' }}>-</span> : <CountCell value={v} record={r} filter="success" color="#10b981" /> },
    { title: '失败', dataIndex: 'failCount', width: 70, render: (v: number, r: any) => r.taskStatus === 'INIT' ? <span style={{ color: 'rgba(255,255,255,0.2)' }}>-</span> : <CountCell value={v} record={r} filter="failed" color="#ef4444" /> },
    { title: '创建时间', dataIndex: 'createdAt', width: 170 },
    {
      title: '操作', width: 300,
      render: (_: any, record: any) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Space size={8}>
            <ActionLink success
              disabled={record.taskStatus === 'RUNNING' || record.submitStatus === 'SUBMITTED'}
              disabledReason={record.taskStatus === 'RUNNING' ? '任务正在运行中' : '已提交审批，不可运行'}
              onClick={() => handleRun(record)}>
              {record.taskStatus === 'SUCCESS' ? '重新运行' : record.taskStatus === 'FAILED' ? '重试' : '运行'}
            </ActionLink>
            <ActionLink
              disabled={record.taskStatus === 'RUNNING' || record.submitStatus === 'SUBMITTED' || record.taskStatus === 'SUCCESS'}
              disabledReason={record.taskStatus === 'RUNNING' ? '运行中不可编辑' : record.submitStatus === 'SUBMITTED' ? '已提交审批不可编辑' : '需先撤销后才能编辑'}
              onClick={() => { setEditRecord(record); setEditOpen(true); }}>
              编辑
            </ActionLink>
            <ActionLink success
              disabled={record.taskStatus !== 'SUCCESS' || record.submitStatus === 'SUBMITTED'}
              disabledReason={record.taskStatus !== 'SUCCESS' ? '仅运行成功的任务可提交' : '任务已提交'}
              onClick={() => handleSubmit(record)}>
              提交
            </ActionLink>
          </Space>
          <Space size={8}>
            <ActionLink danger
              disabled={record.taskStatus !== 'SUCCESS' || record.submitStatus === 'SUBMITTED'}
              disabledReason={record.taskStatus !== 'SUCCESS' ? '仅运行成功的任务可撤销' : '已提交审批不可撤销'}
              onClick={() => {
                Modal.confirm({ title: '确认撤销', icon: <ExclamationCircleOutlined style={{ color: '#0ea5e9' }} />, content: '将清除运行结果，任务恢复到未运行状态。确认撤销？', okText: '确认撤销', cancelText: '取消', okButtonProps: { danger: true },
                  onOk: async () => { try { await taskApi.revoke(record.id); message.success('已撤销'); fetchData(); } catch (e: any) { message.error(e.message || '撤销失败'); } },
                });
              }}>
              撤销
            </ActionLink>
            <ActionLink
              disabled={record.taskStatus !== 'SUCCESS'}
              disabledReason="仅运行成功的任务可查看结果"
              onClick={() => openResult(record)}>
              查看结果
            </ActionLink>
            <ActionLink danger
              disabled={record.taskStatus === 'RUNNING' || record.submitStatus === 'SUBMITTED' || record.taskStatus === 'SUCCESS'}
              disabledReason={record.taskStatus === 'RUNNING' ? '运行中不可删除' : record.submitStatus === 'SUBMITTED' ? '已提交审批不可删除' : '请先撤销后再删除'}
              onClick={() => {
                Modal.confirm({ title: '确认删除', icon: <ExclamationCircleOutlined style={{ color: '#0ea5e9' }} />, content: '删除后不可恢复，确认删除该任务？', okText: '确认删除', cancelText: '取消', okButtonProps: { danger: true },
                  onOk: async () => { try { await taskApi.delete(record.id); message.success('已删除'); fetchData(); } catch (e: any) { message.error(e.message || '删除失败'); } },
                });
              }}>
              删除
            </ActionLink>
          </Space>
        </div>
      ),
    },
  ];

  return (
    <div className="page-container">
      <div className="page-toolbar">
        <Space>
          <Input placeholder="搜索任务名称、编号" value={keyword} onChange={e => setKeyword(e.target.value)} onPressEnter={() => fetchData(1)} prefix={<SearchOutlined />} style={{ width: 240 }} />
          <Select placeholder="运行状态" allowClear style={{ width: 120 }} value={filterTaskStatus} onChange={v => setFilterTaskStatus(v)}>
            <Option value="INIT">待运行</Option><Option value="RUNNING">运行中</Option><Option value="SUCCESS">运行成功</Option><Option value="FAILED">运行失败</Option>
          </Select>
          <Button onClick={() => fetchData(1)}>查询</Button>
          <Button onClick={() => { setKeyword(''); setFilterTaskStatus(undefined); fetchData(1); }}>重置</Button>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>新建</Button>
      </div>
      <Table rowKey="id" columns={columns} dataSource={data} loading={loading}
        pagination={{ current, total, pageSize, showTotal: t => `共 ${t} 条`, showSizeChanger: true, onChange: (p, s) => { setCurrent(p); setPageSize(s); fetchData(p, s); } }} />

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
      <Drawer title={`打标结果 — ${resultTask?.taskName || ''}`} open={resultOpen} width={900} onClose={() => setResultOpen(false)} destroyOnClose>
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
                <div><span style={{ color: 'rgba(255,255,255,0.4)' }}>来源任务：</span><span style={{ color: 'rgba(255,255,255,0.85)' }}>{resultTask?.taskName}</span></div>
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
