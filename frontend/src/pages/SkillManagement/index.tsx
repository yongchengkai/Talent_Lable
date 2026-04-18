import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, Switch, Space, Tag, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { skillApi } from '@/services/api';

const { TextArea } = Input;
const { Option } = Select;

const categoryColors: Record<string, string> = {
  QUERY: 'blue', MUTATION: 'orange', ANALYSIS: 'purple', SYSTEM: 'default',
};
const categoryLabels: Record<string, string> = {
  QUERY: '查询', MUTATION: '操作', ANALYSIS: '分析', SYSTEM: '系统',
};

const SkillManagement: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [current, setCurrent] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form] = Form.useForm();

  const fetchData = async (page = current) => {
    setLoading(true);
    try {
      const res: any = await skillApi.page({ current: page, size: 10, keyword, category: filterCategory });
      setData(res.data?.records || []);
      setTotal(res.data?.total || 0);
    } catch { message.error('加载失败'); }
    setLoading(false);
  };

  useEffect(() => { fetchData(1); setCurrent(1); }, [keyword, filterCategory]);

  const handleSave = async () => {
    const values = await form.validateFields();
    try {
      if (editingId) {
        await skillApi.update(editingId, values);
        message.success('更新成功');
      } else {
        await skillApi.create(values);
        message.success('创建成功');
      }
      setModalOpen(false);
      form.resetFields();
      setEditingId(null);
      fetchData();
    } catch (e: any) { message.error(e.message || '操作失败'); }
  };

  const handleEdit = (record: any) => {
    setEditingId(record.id);
    form.setFieldsValue(record);
    setModalOpen(true);
  };

  const handleCreate = () => {
    setEditingId(null);
    form.resetFields();
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try { await skillApi.delete(id); message.success('已删除'); fetchData(); }
    catch (e: any) { message.error(e.message || '删除失败'); }
  };

  const handleToggleEnabled = async (id: number) => {
    await skillApi.toggleEnabled(id);
    fetchData();
  };

  const columns = [
    { title: '技能名称', dataIndex: 'skillName', width: 140 },
    { title: '编码', dataIndex: 'skillCode', width: 160, render: (v: string) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v}</span> },
    {
      title: '分类', dataIndex: 'category', width: 80,
      render: (v: string) => <Tag color={categoryColors[v]}>{categoryLabels[v] || v}</Tag>,
    },
    {
      title: '工具映射', dataIndex: 'toolName', width: 150,
      render: (v: string) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v}</span>,
    },
    {
      title: '需确认', dataIndex: 'requiresConfirm', width: 70,
      render: (v: boolean) => v ? <Tag color="red">是</Tag> : <Tag>否</Tag>,
    },
    {
      title: '启用', dataIndex: 'enabled', width: 80,
      render: (v: boolean, r: any) => (
        <Switch checked={v} onChange={() => handleToggleEnabled(r.id)}
                checkedChildren="启用" unCheckedChildren="禁用" />
      ),
    },
    {
      title: '操作', width: 120,
      render: (_: any, r: any) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(r)}>编辑</Button>
          <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(r.id)}>删除</Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <Input.Search placeholder="搜索技能名称、编码" allowClear style={{ width: 240 }} onSearch={v => setKeyword(v)} />
        <Select placeholder="分类" allowClear style={{ width: 120 }} onChange={v => setFilterCategory(v)}>
          {Object.entries(categoryLabels).map(([k, v]) => <Option key={k} value={k}>{v}</Option>)}
        </Select>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>新建</Button>
      </div>

      <Table columns={columns} dataSource={data} rowKey="id" loading={loading}
             pagination={{ current, total, pageSize: 10, onChange: p => { setCurrent(p); fetchData(p); } }}
             scroll={{ x: 900 }} size="middle" />

      <Modal title={editingId ? '编辑技能' : '新建技能'} open={modalOpen} width={680} maskClosable={false}
             onOk={handleSave} onCancel={() => { setModalOpen(false); form.resetFields(); setEditingId(null); }}
             styles={{ body: { maxHeight: '70vh', overflow: 'auto' } }}>
        <Form form={form} layout="vertical">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="skillCode" label="技能编码" rules={[{ required: true }]}>
              <Input disabled={!!editingId} placeholder="如 search_rules" />
            </Form.Item>
            <Form.Item name="skillName" label="技能名称" rules={[{ required: true }]}>
              <Input placeholder="如 搜索打标规则" />
            </Form.Item>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="category" label="分类" rules={[{ required: true }]}>
              <Select>
                {Object.entries(categoryLabels).map(([k, v]) => <Option key={k} value={k}>{v}</Option>)}
              </Select>
            </Form.Item>
            <Form.Item name="toolName" label="工具映射" rules={[{ required: true }]}>
              <Input placeholder="Java Bean 名，如 searchRules" />
            </Form.Item>
            <Form.Item name="requiresConfirm" label="需要确认" valuePropName="checked">
              <Switch checkedChildren="是" unCheckedChildren="否" />
            </Form.Item>
          </div>

          <Form.Item name="description" label="做什么（技能描述）" rules={[{ required: true }]}>
            <TextArea rows={3} placeholder="用自然语言描述这个技能做什么。例如：根据关键词搜索打标规则，支持按规则名称、编码等模糊匹配。" />
          </Form.Item>

          <Form.Item name="whenToUse" label="什么时候用（使用时机）">
            <TextArea rows={3} placeholder="描述 AI 应该在什么场景下调用这个技能。例如：当用户提到规则、想查找某条规则时使用。" />
          </Form.Item>

          <Form.Item name="enabled" label="启用" valuePropName="checked" initialValue={true}>
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SkillManagement;
