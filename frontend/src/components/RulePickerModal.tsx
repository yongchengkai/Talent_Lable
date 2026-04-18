import React, { useState, useEffect } from 'react';
import { Modal, Table, Input, Tag, Space, Button } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { ruleApi } from '@/services/api';

interface RulePickerModalProps {
  open: boolean;
  onOk: (selectedIds: number[]) => void;
  onCancel: () => void;
  /** 只显示已发布规则（正式打标用） */
  publishedOnly?: boolean;
  /** 已选中的规则 ID */
  value?: number[];
}

const RulePickerModal: React.FC<RulePickerModalProps> = ({ open, onOk, onCancel, publishedOnly = false, value = [] }) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [current, setCurrent] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>(value);

  const fetchRules = async (page = 1, search = keyword) => {
    setLoading(true);
    try {
      const params: any = { current: page, size: 10, keyword: search };
      if (publishedOnly) params.status = 'PUBLISHED';
      const res: any = await ruleApi.page(params);
      setData(res.data?.records || []);
      setTotal(res.data?.total || 0);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    if (open) {
      setSelectedRowKeys(value);
      setCurrent(1);
      setKeyword('');
      fetchRules(1, '');
    }
  }, [open]);

  const columns = [
    { title: '规则名称', dataIndex: 'ruleName', width: 180 },
    { title: '规则编码', dataIndex: 'ruleCode', width: 150, render: (v: string) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v}</span> },
    {
      title: '类型', dataIndex: 'ruleType', width: 90,
      render: (v: string) => <Tag color={v === 'STRUCTURED' ? 'blue' : 'purple'}>{v === 'STRUCTURED' ? '条件规则' : '智能规则'}</Tag>,
    },
    ...(!publishedOnly ? [{
      title: '发布状态', dataIndex: 'status', width: 90,
      render: (v: string) => <Tag color={v === 'PUBLISHED' ? 'green' : 'default'}>{v === 'PUBLISHED' ? '已发布' : '未发布'}</Tag>,
    }, {
      title: '正式运行状态', dataIndex: 'runStatus', width: 110,
      render: (v: string, record: any) => {
        if (record.status !== 'PUBLISHED' && !v) return <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>;
        const map: Record<string, { text: string; color: string }> = {
          NOT_RUN: { text: '未运行', color: 'default' },
          RUN_SUCCESS: { text: '运行成功', color: 'green' },
          RUN_FAILED: { text: '运行失败', color: 'red' },
        };
        const m = map[v];
        return m ? <Tag color={m.color}>{m.text}</Tag> : <Tag>未运行</Tag>;
      },
    }] : [{
      title: '版本', dataIndex: 'versionNo', width: 60,
      render: (v: number) => <span style={{ color: 'rgba(255,255,255,0.5)' }}>v{v}</span>,
    }]),
    { title: '规则说明', dataIndex: 'dslExplain', ellipsis: true },
  ];

  return (
    <Modal
      title={`选择规则（已选 ${selectedRowKeys.length} 条）`}
      open={open}
      width={960}
      onOk={() => onOk(selectedRowKeys)}
      onCancel={onCancel}
      okText={`确认选择 (${selectedRowKeys.length})`}
      maskClosable={false}
      destroyOnClose
    >
      <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
        <Input
          placeholder="搜索规则名称或编码"
          prefix={<SearchOutlined />}
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          onPressEnter={() => { setCurrent(1); fetchRules(1); }}
          style={{ width: 280 }}
          allowClear
        />
        <Button onClick={() => { setCurrent(1); fetchRules(1); }}>查询</Button>
        <Button onClick={() => { setKeyword(''); setCurrent(1); fetchRules(1, ''); }}>重置</Button>
        {selectedRowKeys.length > 0 && (
          <Button type="link" danger onClick={() => setSelectedRowKeys([])}>清空已选</Button>
        )}
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        size="small"
        rowSelection={{
          selectedRowKeys,
          onChange: keys => setSelectedRowKeys(keys as number[]),
          preserveSelectedRowKeys: true,
        }}
        pagination={{
          current, total, pageSize: 10, showTotal: t => `共 ${t} 条`,
          onChange: p => { setCurrent(p); fetchRules(p); },
        }}
        scroll={{ x: 800, y: 360 }}
      />
    </Modal>
  );
};

export default RulePickerModal;
