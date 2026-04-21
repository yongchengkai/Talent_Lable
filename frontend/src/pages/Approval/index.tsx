import { useEffect, useState } from 'react';
import { Button, Table, Space, Tag, message, Input, Modal, Select, Drawer } from 'antd';
import { SearchOutlined, CheckCircleOutlined, CloseCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { taskApi, ruleApi } from '@/services/api';

const { Option } = Select;

const taskStatusMap: Record<string, { text: string; color: string }> = {
  INIT: { text: '待运行', color: 'default' },
  RUNNING: { text: '运行中', color: 'processing' },
  SUCCESS: { text: '运行成功', color: 'success' },
  FAILED: { text: '运行失败', color: 'error' },
};

const submitStatusMap: Record<string, { text: string; color: string }> = {
  PENDING: { text: '待提交', color: 'default' },
  SUBMITTED: { text: '已提交待审批', color: 'processing' },
  APPROVED: { text: '已通过', color: 'success' },
  REJECTED: { text: '已驳回', color: 'error' },
};

export default function ApprovalPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>();
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRecord, setDetailRecord] = useState<any>(null);
  const [ruleDetailData, setRuleDetailData] = useState<any[]>([]);
  const [resultOpen, setResultOpen] = useState(false);
  const [resultTask, setResultTask] = useState<any>(null);
  const [resultData, setResultData] = useState<any[]>([]);
  const [resultLoading, setResultLoading] = useState(false);

  const fetchData = async (page = current, size = pageSize) => {
    setLoading(true);
    try {
      const res: any = await taskApi.page({
        current: page, size, keyword, taskMode: 'FORMAL',
        submitStatus: filterStatus || undefined,
      });
      // 只显示已提交或已审批的任务
      const records = (res.data?.records || []).filter((r: any) =>
        ['SUBMITTED', 'APPROVED', 'REJECTED'].includes(r.submitStatus)
      );
      setData(records);
      setTotal(res.data?.total || 0);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(1); }, []);

  const handleApprove = (record: any) => {
    Modal.confirm({
      title: '审批通过',
      icon: <ExclamationCircleOutlined style={{ color: '#0ea5e9' }} />,
      content: `确认通过任务「${record.taskName}」的打标结果？通过后标签结果将正式生效。`,
      okText: '通过',
      cancelText: '取消',
      onOk: async () => {
        try {
          await taskApi.approve(record.id);
          message.success('审批通过，标签结果已生效');
          fetchData();
        } catch (e: any) { message.error(e.message || '操作失败'); }
      },
    });
  };

  const handleReject = (record: any) => {
    Modal.confirm({
      title: '驳回',
      icon: <ExclamationCircleOutlined style={{ color: '#0ea5e9' }} />,
      content: `确认驳回任务「${record.taskName}」？驳回后需重新运行打标。`,
      okText: '驳回',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await taskApi.reject(record.id);
          message.success('已驳回');
          fetchData();
        } catch (e: any) { message.error(e.message || '操作失败'); }
      },
    });
  };

  const openDetail = async (record: any) => {
    setDetailRecord(record);
    setDetailOpen(true);
    try {
      const res: any = await taskApi.getRules(record.id);
      setRuleDetailData(res.data || []);
    } catch { setRuleDetailData([]); }
  };

  const openResult = async (record: any) => {
    setResultTask(record);
    setResultOpen(true);
    setResultLoading(true);
    try {
      const res: any = await taskApi.getResults(record.id);
      setResultData(res.data || []);
    } catch { setResultData([]); }
    setResultLoading(false);
  };

  const columns = [
    {
      title: '任务名称', dataIndex: 'taskName', width: 200,
      render: (name: string, record: any) => (
        <a className="action-link" style={{ fontWeight: 500 }} onClick={() => openDetail(record)}>{name}</a>
      ),
    },
    { title: '任务编号', dataIndex: 'taskNo', width: 160, render: (v: string) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v}</span> },
    {
      title: '运行状态', dataIndex: 'taskStatus', width: 100,
      render: (s: string) => <Tag color={taskStatusMap[s]?.color}>{taskStatusMap[s]?.text || s}</Tag>,
    },
    {
      title: '审批状态', dataIndex: 'submitStatus', width: 120,
      render: (s: string) => <Tag color={submitStatusMap[s]?.color}>{submitStatusMap[s]?.text || s}</Tag>,
    },
    { title: '提交人', dataIndex: 'triggeredBy', width: 100 },
    { title: '运行时间', dataIndex: 'startTime', width: 170 },
    {
      title: '操作', width: 200,
      render: (_: any, record: any) => (
        <Space>
          {record.submitStatus === 'SUBMITTED' && (
            <>
              <a className="action-link action-link-success" onClick={() => handleApprove(record)}>
                <CheckCircleOutlined /> 通过
              </a>
              <a className="action-link action-link-danger" onClick={() => handleReject(record)}>
                <CloseCircleOutlined /> 驳回
              </a>
            </>
          )}
          {record.submitStatus === 'APPROVED' && (
            <span style={{ color: '#10b981', fontSize: 12 }}>已通过</span>
          )}
          {record.submitStatus === 'REJECTED' && (
            <span style={{ color: '#ef4444', fontSize: 12 }}>已驳回</span>
          )}
          <a className="action-link" onClick={() => openResult(record)}>查看结果</a>
        </Space>
      ),
    },
  ];

  const ruleColumns = [
    { title: '规则名称', dataIndex: 'ruleName', width: 180 },
    { title: '规则编码', dataIndex: 'ruleCode', width: 150, render: (v: string) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v}</span> },
    { title: '规则类型', dataIndex: 'ruleType', width: 90, render: (v: string) => <Tag color={v === 'STRUCTURED' ? 'blue' : 'purple'}>{v === 'STRUCTURED' ? '条件规则' : '智能规则'}</Tag> },
    { title: '执行状态', dataIndex: 'status', width: 90, render: (v: string) => <Tag color={v === 'SUCCESS' ? 'success' : v === 'FAILED' ? 'error' : 'default'}>{v === 'SUCCESS' ? '成功' : v === 'FAILED' ? '失败' : v}</Tag> },
    { title: '命中人数', dataIndex: 'hitCount', width: 90 },
  ];

  const resultColumns = [
    { title: '员工姓名', dataIndex: 'employeeName', width: 100 },
    { title: '工号', dataIndex: 'employeeNo', width: 100 },
    { title: '部门', dataIndex: 'orgName', width: 120 },
    { title: '职级', dataIndex: 'gradeLevel', width: 70 },
    { title: '命中标签', dataIndex: 'hitTags', width: 200, render: (tags: string[]) => tags?.length > 0 ? tags.map(t => <Tag key={t} color="green">{t}</Tag>) : <span style={{ color: 'rgba(255,255,255,0.2)' }}>无</span> },
    { title: '命中数', dataIndex: 'hitCount', width: 70, render: (v: number) => <span style={{ fontWeight: 600, color: v > 0 ? '#10b981' : 'rgba(255,255,255,0.2)' }}>{v}</span> },
  ];

  return (
    <div className="page-container">
      <div className="page-toolbar">
        <Space>
          <Input placeholder="搜索任务名称、编号" value={keyword} onChange={e => setKeyword(e.target.value)} onPressEnter={() => fetchData(1)} prefix={<SearchOutlined />} style={{ width: 240 }} />
          <Select placeholder="审批状态" allowClear style={{ width: 140 }} value={filterStatus} onChange={v => { setFilterStatus(v); }}>
            <Option value="SUBMITTED">待审批</Option>
            <Option value="APPROVED">已通过</Option>
            <Option value="REJECTED">已驳回</Option>
          </Select>
          <Button onClick={() => fetchData(1)}>查询</Button>
          <Button onClick={() => { setKeyword(''); setFilterStatus(undefined); fetchData(1); }}>重置</Button>
        </Space>
      </div>

      <Table rowKey="id" columns={columns} dataSource={data} loading={loading}
        pagination={{ current, total, pageSize, showTotal: t => `共 ${t} 条`, showSizeChanger: true, onChange: (p, s) => { setCurrent(p); setPageSize(s); fetchData(p, s); } }} />

      {/* 详情弹窗 */}
      <Modal title="打标任务审批详情" open={detailOpen} onCancel={() => setDetailOpen(false)} maskClosable={false}
        footer={
          <Space>
            {detailRecord?.submitStatus === 'SUBMITTED' && (
              <>
                <Button type="primary" onClick={() => { setDetailOpen(false); handleApprove(detailRecord); }}>通过</Button>
                <Button danger onClick={() => { setDetailOpen(false); handleReject(detailRecord); }}>驳回</Button>
              </>
            )}
            <Button onClick={() => setDetailOpen(false)}>关闭</Button>
          </Space>
        }
        width={700} destroyOnClose>
        {detailRecord && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>任务名称</div>
                <div style={{ fontWeight: 600, color: 'rgba(255,255,255,0.92)' }}>{detailRecord.taskName}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>任务编号</div>
                <div style={{ fontWeight: 600, color: 'rgba(255,255,255,0.92)', fontFamily: 'monospace' }}>{detailRecord.taskNo}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>运行状态</div>
                <Tag color={taskStatusMap[detailRecord.taskStatus]?.color}>{taskStatusMap[detailRecord.taskStatus]?.text}</Tag>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>审批状态</div>
                <Tag color={submitStatusMap[detailRecord.submitStatus]?.color}>{submitStatusMap[detailRecord.submitStatus]?.text}</Tag>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>执行统计</div>
                <div style={{ color: 'rgba(255,255,255,0.92)' }}>
                  总数 {detailRecord.totalCount ?? 0} · 成功 <span style={{ color: '#10b981' }}>{detailRecord.successCount ?? 0}</span> · 失败 <span style={{ color: '#ef4444' }}>{detailRecord.failCount ?? 0}</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>提交人</div>
                <div style={{ color: 'rgba(255,255,255,0.92)' }}>{detailRecord.triggeredBy || '-'}</div>
              </div>
            </div>

            <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>关联规则</div>
            <Table rowKey="ruleId" columns={ruleColumns} dataSource={ruleDetailData} size="small" pagination={false} />
          </div>
        )}
      </Modal>

      {/* 结果抽屉 */}
      <Drawer title={`打标结果 — ${resultTask?.taskName || ''}`} open={resultOpen} width={900} onClose={() => setResultOpen(false)} destroyOnClose>
        <div style={{ marginBottom: 16, color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
          共 {resultData.length} 名员工参与打标，{resultData.filter((r: any) => r.hitCount > 0).length} 人命中标签
        </div>
        <Table columns={resultColumns} dataSource={resultData} rowKey="employeeId" loading={resultLoading} pagination={{ pageSize: 20, showTotal: t => `共 ${t} 人` }} size="small" />
      </Drawer>
    </div>
  );
}
