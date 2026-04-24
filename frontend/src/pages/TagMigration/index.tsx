import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Select, Table, Button, Space, Input, message } from 'antd';
import { SwapRightOutlined, SwapLeftOutlined, SearchOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { categoryApi, tagApi } from '@/services/api';

export default function TagMigrationPage({ embedded, embeddedFilters, onNavigate }: { embedded?: boolean; embeddedFilters?: Record<string, string>; embeddedAction?: string; onNavigate?: (page: string, filters?: Record<string, string>) => void } = {}) {
  const routerNavigate = useNavigate();
  const doNavigate = embedded ? onNavigate : (page: string) => routerNavigate(page);
  const [searchParams] = useSearchParams();
  const [categories, setCategories] = useState<any[]>([]);
  const [leftCatId, setLeftCatId] = useState<number>();
  const [rightCatId, setRightCatId] = useState<number>();
  const [leftTags, setLeftTags] = useState<any[]>([]);
  const [rightTags, setRightTags] = useState<any[]>([]);
  const [leftSelected, setLeftSelected] = useState<number[]>([]);
  const [rightSelected, setRightSelected] = useState<number[]>([]);
  const [leftFilter, setLeftFilter] = useState('');
  const [rightFilter, setRightFilter] = useState('');
  // 暂存原始数据，用于取消时恢复
  const [origLeftTags, setOrigLeftTags] = useState<any[]>([]);
  const [origRightTags, setOrigRightTags] = useState<any[]>([]);
  // 记录待提交的迁移操作：{ tagIds: number[], targetCatId: number }[]
  const [pendingMoves, setPendingMoves] = useState<{ tagIds: number[]; targetCatId: number }[]>([]);

  useEffect(() => {
    categoryApi.listActive().then((res: any) => {
      setCategories(res.data);
      const sourceCatId = embedded ? embeddedFilters?.sourceCatId : searchParams.get('sourceCatId');
      const targetCatId = embedded ? embeddedFilters?.targetCatId : searchParams.get('targetCatId');
      if (sourceCatId) {
        const id = Number(sourceCatId);
        if (res.data.some((c: any) => c.id === id)) {
          setLeftCatId(id);
          loadTags(id, 'left');
        }
      }
      if (targetCatId) {
        const id = Number(targetCatId);
        if (res.data.some((c: any) => c.id === id)) {
          setRightCatId(id);
          loadTags(id, 'right');
        }
      }
    });
  }, []);

  const loadTags = async (catId: number, side: 'left' | 'right') => {
    const res: any = await tagApi.page({ current: 1, size: 500, categoryId: catId });
    const tags = res.data.records;
    if (side === 'left') { setLeftTags(tags); setOrigLeftTags(tags); }
    else { setRightTags(tags); setOrigRightTags(tags); }
  };

  const handleLeftCat = (id: number) => {
    if (pendingMoves.length > 0) {
      setPendingMoves([]);
    }
    setLeftCatId(id); loadTags(id, 'left'); setLeftSelected([]); setLeftFilter('');
    if (rightCatId) loadTags(rightCatId, 'right');
  };

  const handleRightCat = (id: number) => {
    if (pendingMoves.length > 0) {
      setPendingMoves([]);
    }
    setRightCatId(id); loadTags(id, 'right'); setRightSelected([]); setRightFilter('');
    if (leftCatId) loadTags(leftCatId, 'left');
  };

  // 本地移动：左 → 右
  const moveRight = () => {
    if (!rightCatId || leftSelected.length === 0) return;
    const moving = leftTags.filter(t => leftSelected.includes(t.id));
    setLeftTags(prev => prev.filter(t => !leftSelected.includes(t.id)));
    setRightTags(prev => [...prev, ...moving]);
    setPendingMoves(prev => [...prev, { tagIds: [...leftSelected], targetCatId: rightCatId }]);
    setLeftSelected([]);
  };

  // 本地移动：右 → 左
  const moveLeft = () => {
    if (!leftCatId || rightSelected.length === 0) return;
    const moving = rightTags.filter(t => rightSelected.includes(t.id));
    setRightTags(prev => prev.filter(t => !rightSelected.includes(t.id)));
    setLeftTags(prev => [...prev, ...moving]);
    setPendingMoves(prev => [...prev, { tagIds: [...rightSelected], targetCatId: leftCatId }]);
    setRightSelected([]);
  };

  // 提交所有待迁移操作
  const handleConfirm = async () => {
    if (pendingMoves.length === 0) return;
    const totalTags = pendingMoves.reduce((sum, m) => sum + m.tagIds.length, 0);
    try {
      for (const move of pendingMoves) {
        await tagApi.migrate(move.tagIds, move.targetCatId);
      }
      message.success(`迁移完成，共移动 ${totalTags} 个标签`);
      setPendingMoves([]);
      if (leftCatId) loadTags(leftCatId, 'left');
      if (rightCatId) loadTags(rightCatId, 'right');
    } catch (e: any) {
      message.error('迁移失败：' + e.message);
      handleCancel();
    }
  };

  // 取消：恢复到原始状态
  const handleCancel = () => {
    setLeftTags(origLeftTags);
    setRightTags(origRightTags);
    setPendingMoves([]);
    setLeftSelected([]);
    setRightSelected([]);
  };

  const tagColumns = [
    { title: '标签名称', dataIndex: 'tagName', width: 120 },
    { title: '标签编码', dataIndex: 'tagCode', width: 140 },
    { title: '状态', dataIndex: 'status', width: 70, render: (s: string) => s === 'ACTIVE' ? <span style={{ color: '#10b981' }}>启用</span> : <span style={{ color: 'rgba(255,255,255,0.3)' }}>停用</span> },
  ];

  const filterTags = (tags: any[], kw: string) => {
    if (!kw.trim()) return tags;
    const k = kw.toLowerCase();
    return tags.filter(t => t.tagName?.toLowerCase().includes(k) || t.tagCode?.toLowerCase().includes(k));
  };

  const leftFiltered = filterTags(leftTags, leftFilter);
  const rightFiltered = filterTags(rightTags, rightFilter);
  const totalPendingTags = pendingMoves.reduce((sum, m) => sum + m.tagIds.length, 0);

  return (
    <div className={embedded ? undefined : "page-container"} style={embedded ? { width: '100%', maxWidth: '100%', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden', margin: '8px 0', padding: 12 } : undefined}>

      {/* 迁移摘要 + 操作按钮 */}
      {(leftCatId || rightCatId) && (
        <div style={{
          marginBottom: 16,
          padding: embedded ? '8px 12px' : '10px 16px',
          background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.04), rgba(139, 92, 246, 0.03))',
          borderRadius: 10,
          border: '1px solid rgba(255,255,255,0.04)',
          fontSize: embedded ? 12 : 13,
          color: 'rgba(255,255,255,0.55)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span>
            {leftCatId ? `${categories.find(c => c.id === leftCatId)?.categoryName} (${leftTags.length} 个标签)` : '未选择'}
            {' ⇄ '}
            {rightCatId ? `${categories.find(c => c.id === rightCatId)?.categoryName} (${rightTags.length} 个标签)` : '未选择'}
            {pendingMoves.length > 0 && (
              <span style={{ color: '#0ea5e9', marginLeft: 12 }}>
                待提交：{pendingMoves.length} 次移动，{totalPendingTags} 个标签
              </span>
            )}
          </span>
          <Space>
            <Button size={embedded ? 'small' : 'middle'} onClick={handleCancel} disabled={pendingMoves.length === 0}>取消</Button>
            <Button size={embedded ? 'small' : 'middle'} type="primary" onClick={handleConfirm} disabled={pendingMoves.length === 0}>
              确认提交{totalPendingTags > 0 ? `（${totalPendingTags} 个标签）` : ''}
            </Button>
          </Space>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: embedded ? '1fr' : '1fr auto 1fr', gap: embedded ? 12 : 20, alignItems: 'flex-start' }}>
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.06)',
          padding: embedded ? 12 : 20,
        }}>
          <Select placeholder="选择源类目（仅启用状态）" size={embedded ? 'small' : 'middle'} style={{ width: '100%', marginBottom: 12, fontSize: embedded ? 12 : undefined }} value={leftCatId} onChange={handleLeftCat}
            options={categories.filter(c => c.id !== rightCatId).map(c => ({ label: `${c.categoryName}（${c.categoryCode}）`, value: c.id }))} />
          <Input placeholder="按标签名称或编码筛选" size={embedded ? 'small' : 'middle'} prefix={<SearchOutlined />} value={leftFilter} onChange={e => setLeftFilter(e.target.value)}
            allowClear style={{ marginBottom: 12 }} />
          <Table rowKey="id" columns={tagColumns} dataSource={leftFiltered} size="small" pagination={false}
            rowSelection={{ selectedRowKeys: leftSelected, onChange: (keys) => setLeftSelected(keys as number[]) }}
            locale={{ emptyText: leftCatId ? '该类目下暂无标签' : '请先选择类目' }}
            scroll={{ y: embedded ? 260 : 400, x: embedded ? 420 : undefined }} />
          <div style={{ marginTop: 8, fontSize: embedded ? 11 : 12, color: 'rgba(255,255,255,0.3)' }}>
            共 {leftTags.length} 个标签{leftFilter ? `，筛选后 ${leftFiltered.length} 个` : ''}，已选 {leftSelected.length} 个
          </div>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: embedded ? 'row' : 'column',
          gap: 8,
          justifyContent: 'center',
          paddingTop: embedded ? 0 : 100,
        }}>
          <Button
            type="primary"
            icon={<SwapRightOutlined />}
            onClick={moveRight}
            disabled={leftSelected.length === 0 || !rightCatId}
            size={embedded ? 'small' : 'middle'}
            style={{ borderRadius: 8, width: embedded ? 36 : 44, height: embedded ? 32 : 44 }}
          />
          <Button
            type="primary"
            icon={<SwapLeftOutlined />}
            onClick={moveLeft}
            disabled={rightSelected.length === 0 || !leftCatId}
            size={embedded ? 'small' : 'middle'}
            style={{ borderRadius: 8, width: embedded ? 36 : 44, height: embedded ? 32 : 44 }}
          />
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.03)',
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.06)',
          padding: embedded ? 12 : 20,
        }}>
          <Select placeholder="选择目标类目（仅启用状态）" size={embedded ? 'small' : 'middle'} style={{ width: '100%', marginBottom: 12, fontSize: embedded ? 12 : undefined }} value={rightCatId} onChange={handleRightCat}
            options={categories.filter(c => c.id !== leftCatId).map(c => ({ label: `${c.categoryName}（${c.categoryCode}）`, value: c.id }))} />
          <Input placeholder="按标签名称或编码筛选" size={embedded ? 'small' : 'middle'} prefix={<SearchOutlined />} value={rightFilter} onChange={e => setRightFilter(e.target.value)}
            allowClear style={{ marginBottom: 12 }} />
          <Table rowKey="id" columns={tagColumns} dataSource={rightFiltered} size="small" pagination={false}
            rowSelection={{ selectedRowKeys: rightSelected, onChange: (keys) => setRightSelected(keys as number[]) }}
            locale={{ emptyText: rightCatId ? '该类目下暂无标签' : '请先选择类目' }}
            scroll={{ y: embedded ? 260 : 400, x: embedded ? 420 : undefined }} />
          <div style={{ marginTop: 8, fontSize: embedded ? 11 : 12, color: 'rgba(255,255,255,0.3)' }}>
            共 {rightTags.length} 个标签{rightFilter ? `，筛选后 ${rightFiltered.length} 个` : ''}，已选 {rightSelected.length} 个
          </div>
        </div>
      </div>

      {embedded && (
        <div style={{ marginTop: 8, textAlign: 'right' }}>
          <Button
            type="link"
            size="small"
            style={{ fontSize: 12, padding: 0 }}
            onClick={() => doNavigate?.('/app/tag-migration', {
              ...(leftCatId ? { sourceCatId: String(leftCatId) } : {}),
              ...(rightCatId ? { targetCatId: String(rightCatId) } : {}),
            })}
          >
            在页面中查看 →
          </Button>
        </div>
      )}
    </div>
  );
}
