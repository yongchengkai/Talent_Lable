import { Table, Tag, Card, Button } from 'antd';
import { ExportOutlined } from '@ant-design/icons';

const roles = [
  { key: '1', code: 'TAG_ADMIN', name: '标签资产管理员', desc: '管理标签类目和标签资产', permissions: '类目CRUD、标签CRUD、标签迁移' },
  { key: '2', code: 'RULE_ADMIN', name: '规则管理员', desc: '编写和调试打标规则', permissions: '规则CRUD、模拟打标' },
  { key: '3', code: 'RULE_PUBLISHER', name: '任务运营', desc: '发布和停用规则，执行正式打标', permissions: '规则发布、规则停用、正式打标' },
  { key: '4', code: 'RESULT_VIEWER', name: '结果审计员', desc: '查询标签结果和证据', permissions: '结果查询、证据查看、审计日志' },
  { key: '5', code: 'SYS_ADMIN', name: '系统管理员', desc: '权限和全局治理', permissions: '角色管理、用户绑定、审计日志' },
];

const permMatrix = [
  { object: '标签类目', TAG_ADMIN: '全部', RULE_ADMIN: '查看', RULE_PUBLISHER: '查看', RESULT_VIEWER: '查看', SYS_ADMIN: '全部' },
  { object: '标签定义', TAG_ADMIN: '全部', RULE_ADMIN: '查看', RULE_PUBLISHER: '查看', RESULT_VIEWER: '查看', SYS_ADMIN: '全部' },
  { object: '标签迁移', TAG_ADMIN: '全部', RULE_ADMIN: '-', RULE_PUBLISHER: '-', RESULT_VIEWER: '-', SYS_ADMIN: '全部' },
  { object: '条件打标规则', TAG_ADMIN: '查看', RULE_ADMIN: '编辑/删除', RULE_PUBLISHER: '发布/停用', RESULT_VIEWER: '查看', SYS_ADMIN: '全部' },
  { object: '智能打标规则', TAG_ADMIN: '查看', RULE_ADMIN: '编辑/删除', RULE_PUBLISHER: '发布/停用', RESULT_VIEWER: '查看', SYS_ADMIN: '全部' },
  { object: '模拟打标', TAG_ADMIN: '-', RULE_ADMIN: '全部', RULE_PUBLISHER: '查看', RESULT_VIEWER: '查看', SYS_ADMIN: '全部' },
  { object: '正式打标', TAG_ADMIN: '-', RULE_ADMIN: '查看', RULE_PUBLISHER: '全部', RESULT_VIEWER: '查看', SYS_ADMIN: '全部' },
  { object: '规划智能体', TAG_ADMIN: '全部', RULE_ADMIN: '全部', RULE_PUBLISHER: '查看', RESULT_VIEWER: '-', SYS_ADMIN: '全部' },
  { object: '权限管理', TAG_ADMIN: '-', RULE_ADMIN: '-', RULE_PUBLISHER: '-', RESULT_VIEWER: '-', SYS_ADMIN: '全部' },
];

const userBindings = [
  { key: '1', user: '张三', role: '标签资产管理员', scope: '全公司' },
  { key: '2', user: '李四', role: '规则管理员', scope: '产研中心' },
  { key: '3', user: '王五', role: '任务运营', scope: '产研中心、职能中心' },
  { key: '4', user: '赵六', role: '结果审计员', scope: '全公司' },
  { key: '5', user: '管理员', role: '系统管理员', scope: '全公司' },
];

const governanceRules = [
  '标签管理员只能管理标签资产（类目、标签、迁移），不能操作规则和任务',
  '规则管理员可以编写和调试规则，但不能发布到正式环境',
  '规则发布需由任务运营角色执行，确保规则经过模拟验证',
  '结果审计员只有查看权限，不能修改任何数据',
  '系统管理员拥有全部权限，负责角色分配和全局治理',
  '角色权限变更需记录审计日志',
];

export default function PermissionPage() {
  const roleColumns = [
    { title: '角色编码', dataIndex: 'code', width: 160 },
    { title: '角色名称', dataIndex: 'name', width: 140 },
    { title: '说明', dataIndex: 'desc' },
    { title: '权限范围', dataIndex: 'permissions' },
  ];

  const permColumns = [
    { title: '对象/操作', dataIndex: 'object', width: 140, fixed: 'left' as const },
    ...['TAG_ADMIN', 'RULE_ADMIN', 'RULE_PUBLISHER', 'RESULT_VIEWER', 'SYS_ADMIN'].map(role => ({
      title: roles.find(r => r.code === role)?.name || role,
      dataIndex: role,
      width: 130,
      render: (v: string) => {
        const color = v === '全部' ? 'green' : v === '-' ? 'default' : 'blue';
        return <Tag color={color}>{v}</Tag>;
      },
    })),
  ];

  const userColumns = [
    { title: '用户', dataIndex: 'user', width: 120 },
    { title: '角色', dataIndex: 'role', width: 160 },
    { title: '数据范围', dataIndex: 'scope' },
  ];

  return (
    <div className="page-container">
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
        </div>
        <Button icon={<ExportOutlined />}>导出权限矩阵</Button>
      </div>

      <Card title="角色列表" size="small" style={{ marginBottom: 20, border: '1px solid rgba(255,255,255,0.06)' }}>
        <Table rowKey="key" columns={roleColumns} dataSource={roles} pagination={false} size="small" />
      </Card>

      <Card title="对象级权限矩阵" size="small" style={{ marginBottom: 20, border: '1px solid rgba(255,255,255,0.06)' }}>
        <Table rowKey="object" columns={permColumns} dataSource={permMatrix} pagination={false} size="small" scroll={{ x: 900 }} />
      </Card>

      <Card title="用户绑定与范围" size="small" style={{ marginBottom: 20, border: '1px solid rgba(255,255,255,0.06)' }}>
        <Table rowKey="key" columns={userColumns} dataSource={userBindings} pagination={false} size="small" />
      </Card>

      <Card title="权限治理规则" size="small" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
        <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 2.2, fontSize: 13, color: 'rgba(255,255,255,0.92)' }}>
          {governanceRules.map((rule, i) => (
            <li key={i}>{rule}</li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
