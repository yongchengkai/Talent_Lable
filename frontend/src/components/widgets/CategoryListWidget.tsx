import React, { useEffect, useState } from 'react';
import { Table, Tag, Button, Input, Select, Space } from 'antd';
import { RightOutlined, SearchOutlined } from '@ant-design/icons';
import { categoryApi } from '@/services/api';
import dayjs from 'dayjs';

const { Option } = Select;

interface Props {
  filters?: Record<string, string>;
  limit?: number;
  onNavigate?: (page: string, filters?: Record<string, string>) => void;
}

const CategoryListWidget: React.FC<Props> = React.memo(({ filters: initFilters = {}, limit, onNavigate }) => {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetchedAt, setFetchedAt] = useState('');
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(limit || 10);
  const [keyword, setKeyword] = useState(initFilters.keyword || '');
  const [filterStatus, setFilterStatus] = useState<string | undefined>(initFilters.status);

  const fetchData = (page = current, size = pageSize, kw = keyword, status = filterStatus) => {
    setLoading(true);
    categoryApi.page({ current: page, size, keyword: kw || undefined, status: status || undefined })
      .then((res: any) => {
        setData(res.data?.records || []);
        setTotal(res.data?.total || 0);
        setFetchedAt(dayjs().format('HH:mm'));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(1); }, []);

  const handleSearch = () => { setCurrent(1); fetchData(1, pageSize, keyword, filterStatus); };
  const handleReset = () => { setKeyword(''); setFilterStatus(undefined); setCurrent(1); fetchData(1, pageSize, '', undefined); };

  const columns = [
    { title: '类目名称', dataIndex: 'categoryName', width: 140, render: (v: string) => <span style={{ fontWeight: 500 }}>{v}</span> },
    { title: '类目编码', dataIndex: 'categoryCode', width: 120, render: (v: string) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v}</span> },
    { title: '说明', dataIndex: 'description', ellipsis: true },
    { title: '标签数量', dataIndex: 'tagCount', width: 120, render: (_: any, record: any) => (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
        <span style={{ color: '#10b981' }}>{record.activeTagCount ?? 0} 启用</span>
        <span style={{ color: 'rgba(255,255,255,0.3)' }}>{record.inactiveTagCount ?? 0} 停用</span>
      </span>
    )},
    { title: '状态', dataIndex: 'status', width: 70, render: (s: string) => <Tag color={s === 'ACTIVE' ? 'green' : 'default'}>{s === 'ACTIVE' ? '启用' : '停用'}</Tag> },
    { title: '创建时间', dataIndex: 'createdAt', width: 140, render: (v: string) => <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{v}</span> },
  ];

  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden', margin: '8px 0' }}>
      {/* 标题栏 */}
      <div style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>标签类目</span>
        {fetchedAt && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>数据截至 {fetchedAt}</span>}
      </div>
      {/* 搜索栏 */}
      <div style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <Space size={6}>
          <Input placeholder="搜索类目名称、编码" value={keyword} onChange={e => setKeyword(e.target.value)} onPressEnter={handleSearch} prefix={<SearchOutlined />} size="small" style={{ width: 180, fontSize: 12 }} allowClear />
          <Select placeholder="状态" allowClear size="small" style={{ width: 80, fontSize: 12 }} value={filterStatus} onChange={v => setFilterStatus(v)}>
            <Option value="ACTIVE">启用</Option>
            <Option value="INACTIVE">停用</Option>
          </Select>
          <Button size="small" onClick={handleSearch} style={{ fontSize: 12 }}>查询</Button>
          <Button size="small" onClick={handleReset} style={{ fontSize: 12 }}>重置</Button>
        </Space>
      </div>
      {/* 表格 */}
      <Table
        rowKey="id"
        dataSource={data}
        columns={columns}
        size="small"
        loading={loading}
        style={{ fontSize: 12 }}
        scroll={{ x: 800 }}
        pagination={{
          current, total, pageSize,
          showTotal: (t) => `共 ${t} 条`,
          showSizeChanger: true,
          showQuickJumper: true,
          pageSizeOptions: ['5', '10', '20', '50'],
          size: 'small',
          onChange: (p, s) => { setCurrent(p); setPageSize(s); fetchData(p, s); },
        }}
      />
      {/* 底部跳转 */}
      <div style={{ padding: '4px 12px', borderTop: '1px solid rgba(255,255,255,0.04)', textAlign: 'right' }}>
        <Button type="link" size="small" style={{ fontSize: 12, padding: 0 }} onClick={() => onNavigate?.('/app/tag-categories', { ...(keyword ? { keyword } : {}), ...(filterStatus ? { status: filterStatus } : {}) })}>
          在页面中查看 <RightOutlined style={{ fontSize: 10 }} />
        </Button>
      </div>
    </div>
  );
});

export default CategoryListWidget;
