import React, { useState, useEffect, useCallback } from 'react';
import { Tree, Table, Input, Checkbox, Tag, Space, Empty } from 'antd';
import { SearchOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons';
import { employeeApi } from '@/services/api';

export interface ScopeValue {
  type: 'FULL' | 'CUSTOM';
  orgIds: number[];
  employeeIds: number[];
}

interface ScopeSelectorProps {
  value?: ScopeValue;
  onChange?: (value: ScopeValue) => void;
}

interface OrgNode {
  key: string;
  title: string;
  orgId?: number;
  employeeCount: number;
  children?: OrgNode[];
}

const ScopeSelector: React.FC<ScopeSelectorProps> = ({ value, onChange }) => {
  const [treeData, setTreeData] = useState<OrgNode[]>([]);
  const [selectedOrgNode, setSelectedOrgNode] = useState<OrgNode | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [empLoading, setEmpLoading] = useState(false);
  const [empTotal, setEmpTotal] = useState(0);
  const [empPage, setEmpPage] = useState(1);
  const [empKeyword, setEmpKeyword] = useState('');
  const [checkedOrgKeys, setCheckedOrgKeys] = useState<string[]>([]);
  const [checkedEmpIds, setCheckedEmpIds] = useState<Set<number>>(new Set());
  const [isFullSelect, setIsFullSelect] = useState(value?.type === 'FULL');
  const [totalEmployeeCount, setTotalEmployeeCount] = useState(0);

  // 从 orgNode 收集所有 orgId
  const collectOrgIds = useCallback((nodes: OrgNode[]): number[] => {
    const ids: number[] = [];
    const walk = (list: OrgNode[]) => {
      for (const n of list) {
        if (n.orgId) ids.push(n.orgId);
        if (n.children) walk(n.children);
      }
    };
    walk(nodes);
    return ids;
  }, []);

  // 从 checkedOrgKeys 提取 orgIds
  const getOrgIdsFromKeys = useCallback((keys: string[]): number[] => {
    const ids: number[] = [];
    const walk = (nodes: OrgNode[]) => {
      for (const n of nodes) {
        if (keys.includes(n.key) && n.orgId) ids.push(n.orgId);
        if (n.children) walk(n.children);
      }
    };
    walk(treeData);
    return ids;
  }, [treeData]);

  // 加载组织树
  useEffect(() => {
    employeeApi.orgTree().then((res: any) => {
      const data = res.data || [];
      setTreeData(data);
      // 计算总人数
      const countAll = (nodes: any[]): number =>
        nodes.reduce((s: number, n: any) => s + (n.employeeCount || 0), 0);
      setTotalEmployeeCount(countAll(data));
    }).catch(() => {});
  }, []);

  // 初始化已选状态
  useEffect(() => {
    if (value?.type === 'FULL') {
      setIsFullSelect(true);
    } else if (value) {
      setIsFullSelect(false);
      if (value.employeeIds?.length) {
        setCheckedEmpIds(new Set(value.employeeIds));
      }
    }
  }, []);

  // 加载员工列表
  const loadEmployees = async (orgId: number, page = 1, keyword = '') => {
    setEmpLoading(true);
    try {
      const res: any = await employeeApi.page({ orgId, current: page, size: 20, keyword });
      setEmployees(res.data?.records || []);
      setEmpTotal(res.data?.total || 0);
    } catch {
      setEmployees([]);
      setEmpTotal(0);
    }
    setEmpLoading(false);
  };

  // 点击组织节点
  const handleSelectOrg = (selectedKeys: React.Key[], info: any) => {
    const node = info.node as OrgNode;
    setSelectedOrgNode(node);
    setEmpPage(1);
    setEmpKeyword('');
    if (node.orgId) {
      loadEmployees(node.orgId, 1, '');
    } else {
      setEmployees([]);
      setEmpTotal(0);
    }
  };

  // 勾选组织
  const handleCheckOrg = (checked: any, info: any) => {
    const keys = (checked as { checked: string[] }).checked || checked;
    setCheckedOrgKeys(keys as string[]);
    emitChange(false, keys as string[], checkedEmpIds);
  };

  // 勾选员工
  const handleCheckEmp = (empId: number, checked: boolean) => {
    const next = new Set(checkedEmpIds);
    if (checked) next.add(empId);
    else next.delete(empId);
    setCheckedEmpIds(next);
    emitChange(false, checkedOrgKeys, next);
  };

  // 全选切换
  const handleFullSelect = (checked: boolean) => {
    setIsFullSelect(checked);
    if (checked) {
      onChange?.({ type: 'FULL', orgIds: [], employeeIds: [] });
    } else {
      emitChange(false, checkedOrgKeys, checkedEmpIds);
    }
  };

  // 发射变更
  const emitChange = (full: boolean, orgKeys: string[], empIds: Set<number>) => {
    if (full) {
      onChange?.({ type: 'FULL', orgIds: [], employeeIds: [] });
    } else {
      const orgIds = getOrgIdsFromKeys(orgKeys);
      onChange?.({
        type: 'CUSTOM',
        orgIds,
        employeeIds: Array.from(empIds),
      });
    }
  };

  // 计算已选人数摘要
  const selectedOrgCount = checkedOrgKeys.length;
  const selectedEmpCount = checkedEmpIds.size;

  // 渲染组织树标题
  const renderTreeTitle = (node: OrgNode) => (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span>{node.title}</span>
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>({node.employeeCount})</span>
    </span>
  );

  const empColumns = [
    {
      title: '', width: 40,
      render: (_: any, record: any) => (
        <Checkbox
          checked={isFullSelect || checkedEmpIds.has(record.id)}
          disabled={isFullSelect}
          onChange={e => handleCheckEmp(record.id, e.target.checked)}
        />
      ),
    },
    { title: '工号', dataIndex: 'employeeNo', width: 100 },
    { title: '姓名', dataIndex: 'name', width: 80 },
    { title: '职级', dataIndex: 'gradeLevel', width: 60 },
    { title: '职务', dataIndex: 'jobTitle', ellipsis: true },
  ];

  return (
    <div style={{
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 8,
      overflow: 'hidden',
    }}>
      {/* 顶部栏 */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '8px 12px',
        background: 'rgba(255,255,255,0.02)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Checkbox checked={isFullSelect} onChange={e => handleFullSelect(e.target.checked)}>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>全员</span>
          </Checkbox>
          {totalEmployeeCount > 0 && (
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
              共 {totalEmployeeCount} 人
            </span>
          )}
        </div>
        {!isFullSelect && (selectedOrgCount > 0 || selectedEmpCount > 0) && (
          <span style={{ fontSize: 12, color: '#0ea5e9' }}>
            {selectedOrgCount > 0 && `${selectedOrgCount} 个组织`}
            {selectedOrgCount > 0 && selectedEmpCount > 0 && '、'}
            {selectedEmpCount > 0 && `${selectedEmpCount} 人`}
          </span>
        )}
      </div>

      {/* 主体：左右分栏 */}
      {!isFullSelect && (
        <div style={{ display: 'flex', height: 320 }}>
          {/* 左侧组织树 */}
          <div style={{
            width: 220, borderRight: '1px solid rgba(255,255,255,0.04)',
            overflow: 'auto', padding: 8,
          }}>
            {treeData.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无组织" style={{ marginTop: 40 }} />
            ) : (
              <Tree
                treeData={treeData}
                checkable
                checkStrictly
                checkedKeys={checkedOrgKeys}
                onCheck={handleCheckOrg}
                onSelect={handleSelectOrg}
                titleRender={(node: any) => renderTreeTitle(node as OrgNode)}
                fieldNames={{ key: 'key', title: 'title', children: 'children' }}
                style={{ background: 'transparent' }}
              />
            )}
          </div>

          {/* 右侧员工列表 */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {selectedOrgNode ? (
              <>
                <div style={{
                  padding: '8px 12px',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <TeamOutlined style={{ color: '#0ea5e9', fontSize: 13 }} />
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
                    {selectedOrgNode.title}
                  </span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
                    {empTotal} 人
                  </span>
                  <div style={{ marginLeft: 'auto' }}>
                    <Input
                      size="small" prefix={<SearchOutlined style={{ color: 'rgba(255,255,255,0.2)' }} />}
                      placeholder="搜索姓名/工号"
                      value={empKeyword}
                      onChange={e => setEmpKeyword(e.target.value)}
                      onPressEnter={() => { setEmpPage(1); loadEmployees(selectedOrgNode.orgId!, 1, empKeyword); }}
                      allowClear
                      style={{ width: 160 }}
                    />
                  </div>
                </div>
                <div style={{ flex: 1, overflow: 'auto' }}>
                  <Table
                    rowKey="id"
                    columns={empColumns}
                    dataSource={employees}
                    loading={empLoading}
                    size="small"
                    pagination={{
                      current: empPage, total: empTotal, pageSize: 20, size: 'small',
                      showTotal: t => `${t} 人`,
                      onChange: p => { setEmpPage(p); loadEmployees(selectedOrgNode.orgId!, p, empKeyword); },
                    }}
                  />
                </div>
              </>
            ) : (
              <div style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                color: 'rgba(255,255,255,0.2)',
              }}>
                <UserOutlined style={{ fontSize: 32, marginBottom: 12 }} />
                <span style={{ fontSize: 13 }}>点击左侧组织查看员工</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ScopeSelector;
