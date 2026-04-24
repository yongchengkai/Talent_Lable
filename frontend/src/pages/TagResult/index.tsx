import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Space, Tag, Input, Select, Button, Modal } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { employeeApi } from '@/services/api';

const { Option } = Select;

export default function TagResultPage({ embedded, embeddedFilters, onNavigate }: { embedded?: boolean; embeddedFilters?: Record<string, string>; embeddedAction?: string; onNavigate?: (page: string, filters?: Record<string, string>) => void } = {}) {
  const routerNavigate = useNavigate();
  const doNavigate = embedded ? onNavigate : (page: string) => routerNavigate(page);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState(embeddedFilters?.keyword || '');
  const [filterGrade, setFilterGrade] = useState<string | undefined>(embeddedFilters?.gradeLevel);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchData = async (page = current, size = pageSize, kw = keyword, grade = filterGrade) => {
    setLoading(true);
    try {
      const res: any = await employeeApi.tagResults({ current: page, size, keyword: kw, gradeLevel: grade });
      setData(res.data?.records || []);
      setTotal(res.data?.total || 0);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchData(1); }, []);

  const openDetail = async (record: any) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailData(null);
    try {
      const res: any = await employeeApi.getById(record.id);
      setDetailData({ ...res.data, tags: record.tags });
    } catch { setDetailData(null); }
    setDetailLoading(false);
  };

  const columns = [
    {
      title: '姓名', dataIndex: 'name', width: 100,
      render: (name: string, record: any) => embedded ? <span style={{ fontWeight: 500 }}>{name}</span> : <a className="action-link" style={{ fontWeight: 500 }} onClick={() => openDetail(record)}>{name}</a>,
    },
    { title: '工号', dataIndex: 'employeeNo', width: 110, render: (v: string) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v}</span> },
    { title: '组织', dataIndex: 'orgName', width: 140 },
    { title: '职级', dataIndex: 'gradeLevel', width: 70 },
    { title: '岗位', dataIndex: 'jobTitle', ellipsis: true, width: 140 },
    { title: '岗位序列', dataIndex: 'positionSequenceName', width: 120 },
    {
      title: '标签', dataIndex: 'tags', width: 280,
      render: (tags: any[]) => {
        if (!tags || tags.length === 0) return <span style={{ color: 'rgba(255,255,255,0.2)' }}>暂无标签</span>;
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {tags.map((t: any) => <Tag key={t.tagId} color="cyan" style={{ margin: 0, fontSize: 11 }}>{t.tagName}</Tag>)}
          </div>
        );
      },
    },
    { title: '标签数', dataIndex: 'tagCount', width: 70, render: (v: number) => <span style={{ fontWeight: 600, color: v > 0 ? '#22d3ee' : 'rgba(255,255,255,0.2)' }}>{v}</span> },
  ];

  const fieldStyle: React.CSSProperties = { fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 4 };
  const valueStyle: React.CSSProperties = { color: 'rgba(255,255,255,0.92)', fontWeight: 500 };

  return (
    <div className={embedded ? undefined : "page-container"} style={embedded ? { width: '100%', maxWidth: '100%', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden', margin: '8px 0' } : undefined}>
      <div className={embedded ? undefined : "page-toolbar"} style={embedded ? { padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)' } : undefined}>
        <Space size={embedded ? 6 : 8} wrap={embedded}>
          <Input placeholder="搜索姓名、工号" size={embedded ? 'small' : 'middle'} value={keyword} onChange={e => setKeyword(e.target.value)} onPressEnter={() => fetchData(1)} prefix={<SearchOutlined />} style={{ width: embedded ? 170 : 220, fontSize: embedded ? 12 : undefined }} />
          <Select placeholder="职级" allowClear size={embedded ? 'small' : 'middle'} style={{ width: embedded ? 90 : 100, fontSize: embedded ? 12 : undefined }} value={filterGrade} onChange={v => setFilterGrade(v)}>
            {['P3','P4','P5','P6','P7','P8','P9','P10'].map(g => <Option key={g} value={g}>{g}</Option>)}
          </Select>
          <Button size={embedded ? 'small' : 'middle'} onClick={() => fetchData(1)} style={embedded ? { fontSize: 12 } : undefined}>查询</Button>
          <Button size={embedded ? 'small' : 'middle'} onClick={() => { setKeyword(''); setFilterGrade(undefined); fetchData(1, pageSize, '', undefined); }} style={embedded ? { fontSize: 12 } : undefined}>重置</Button>
        </Space>
      </div>

      <Table rowKey="id" columns={columns} dataSource={data} loading={loading}
        size={embedded ? 'small' : undefined}
        scroll={embedded ? { x: 960 } : undefined}
        style={embedded ? { fontSize: 12 } : undefined}
        pagination={{
          current, total, pageSize: embedded ? 10 : pageSize, showTotal: t => `共 ${t} 人`,
          showSizeChanger: true, showQuickJumper: !embedded,
          pageSizeOptions: embedded ? ['5', '10', '20'] : ['10', '20', '50', '100'],
          size: embedded ? 'small' : undefined,
          onChange: (p, s) => { setCurrent(p); setPageSize(s); fetchData(p, s); },
        }}
      />

      {embedded && (
        <div style={{ padding: '4px 12px', borderTop: '1px solid rgba(255,255,255,0.04)', textAlign: 'right' }}>
          <Button
            type="link"
            size="small"
            style={{ fontSize: 12, padding: 0 }}
            onClick={() => doNavigate?.('/app/tag-results', {
              ...(keyword ? { keyword } : {}),
              ...(filterGrade ? { gradeLevel: filterGrade } : {}),
            })}
          >
            在页面中查看 →
          </Button>
        </div>
      )}

      <Modal title="员工详情" open={detailOpen} onCancel={() => setDetailOpen(false)}
        footer={<Button onClick={() => setDetailOpen(false)}>关闭</Button>}
        width={640} maskClosable={false} destroyOnClose>
        {detailLoading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.3)' }}>加载中...</div>
        ) : detailData ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}>
            <div><div style={fieldStyle}>姓名</div><div style={valueStyle}>{detailData.name}</div></div>
            <div><div style={fieldStyle}>工号</div><div style={{ ...valueStyle, fontFamily: "'JetBrains Mono', monospace" }}>{detailData.employeeNo}</div></div>
            <div><div style={fieldStyle}>组织</div><div style={valueStyle}>{detailData.orgName || '-'}</div></div>
            <div><div style={fieldStyle}>职级</div><div style={valueStyle}>{detailData.gradeLevel || '-'}</div></div>
            <div><div style={fieldStyle}>岗位</div><div style={valueStyle}>{detailData.jobTitle || '-'}</div></div>
            <div><div style={fieldStyle}>位序列</div><div style={valueStyle}>{detailData.positionSequenceName || '-'}</div></div>
            <div><div style={fieldStyle}>职族</div><div style={valueStyle}>{detailData.jobFamilyName || '-'}</div></div>
            <div><div style={fieldStyle}>用工类型</div><div style={valueStyle}>{detailData.employmentType || '-'}</div></div>
            <div><div style={fieldStyle}>学历</div><div style={valueStyle}>{detailData.education || '-'}</div></div>
            <div><div style={fieldStyle}>毕业院校</div><div style={valueStyle}>{detailData.university || '-'}</div></div>
            <div><div style={fieldStyle}>入职日期</div><div style={valueStyle}>{detailData.hireDate || '-'}</div></div>
            <div><div style={fieldStyle}>出生日期</div><div style={valueStyle}>{detailData.birthDate || '-'}</div></div>
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={fieldStyle}>当前标签</div>
              {detailData.tags && detailData.tags.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {detailData.tags.map((t: any) => (
                    <Tag key={t.tagId} color="cyan" style={{ fontSize: 12 }}>
                      {t.tagName}
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginLeft: 4 }}>{t.tagCode}</span>
                    </Tag>
                  ))}
                </div>
              ) : <span style={{ color: 'rgba(255,255,255,0.2)' }}>暂无标签</span>}
            </div>
            {detailData.resumeText && (
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={fieldStyle}>简历摘要</div>
                <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap',
                  background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)',
                  maxHeight: 150, overflow: 'auto' }}>{detailData.resumeText}</div>
              </div>
            )}
            {detailData.projectExperience && (
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={fieldStyle}>项目经历</div>
                <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap',
                  background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)',
                  maxHeight: 150, overflow: 'auto' }}>{detailData.projectExperience}</div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.3)' }}>加载失败</div>
        )}
      </Modal>
    </div>
  );
}
