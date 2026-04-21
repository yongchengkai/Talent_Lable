import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, Switch, Space, Tag, message, InputNumber } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, StarOutlined, StarFilled, ApiOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { modelConfigApi } from '@/services/api';

const { Option } = Select;

const providerColors: Record<string, string> = {
  OPENAI: 'green', AZURE: 'blue', DEEPSEEK: 'purple', OLLAMA: 'orange',
};

const ModelConfig: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [current, setCurrent] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [testLoading, setTestLoading] = useState<number | null>(null);
  const [form] = Form.useForm();

  const fetchData = async (page = current) => {
    setLoading(true);
    try {
      const res: any = await modelConfigApi.page({ current: page, size: 20 });
      setData(res.data?.records || []);
      setTotal(res.data?.total || 0);
    } catch { message.error('加载失败'); }
    setLoading(false);
  };

  useEffect(() => { fetchData(1); }, []);

  const handleSave = async () => {
    const values = await form.validateFields();
    try {
      if (editingId) {
        await modelConfigApi.update(editingId, values);
        message.success('更新成功');
      } else {
        await modelConfigApi.create({ ...values, createdBy: 'admin', updatedBy: 'admin' });
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

  const handleDelete = async (id: number) => {
    Modal.confirm({ title: '确认删除', icon: <ExclamationCircleOutlined style={{ color: '#0ea5e9' }} />, content: '删除后不可恢复，确认删除该模型配置？', okText: '确认删除', cancelText: '取消', okButtonProps: { danger: true },
      onOk: async () => {
        try { await modelConfigApi.delete(id); message.success('已删除'); fetchData(); }
        catch (e: any) { message.error(e.message || '删除失败'); }
      },
    });
  };

  const handleSetDefault = async (id: number) => {
    await modelConfigApi.setDefault(id);
    message.success('已设为默认');
    fetchData();
  };

  const handleTest = async (id: number) => {
    setTestLoading(id);
    try {
      const res: any = await modelConfigApi.testConnection(id);
      if (res.data?.success) {
        message.success('连接成功');
      } else {
        message.warning(res.data?.message || '连接失败');
      }
    } catch (e: any) { message.error('测试失败: ' + (e.message || '')); }
    setTestLoading(null);
  };

  const maskApiKey = (key: string) => {
    if (!key) return '-';
    if (key.length <= 8) return '****';
    return key.substring(0, 4) + '****' + key.substring(key.length - 4);
  };

  const columns = [
    { title: '模型编码', dataIndex: 'modelCode', width: 150 },
    { title: '名称', dataIndex: 'modelName', width: 140 },
    {
      title: '提供商', dataIndex: 'provider', width: 110,
      render: (v: string) => <Tag color={providerColors[v] || 'default'}>{v}</Tag>,
    },
    { title: 'Base URL', dataIndex: 'baseUrl', width: 200, ellipsis: true },
    {
      title: 'API Key', dataIndex: 'apiKey', width: 160,
      render: (v: string) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{maskApiKey(v)}</span>,
    },
    { title: '温度', dataIndex: 'temperature', width: 80 },
    { title: 'Max Tokens', dataIndex: 'maxTokens', width: 110 },
    {
      title: '默认', dataIndex: 'isDefault', width: 80,
      render: (v: boolean, r: any) => v
        ? <StarFilled style={{ color: '#faad14', fontSize: 18 }} />
        : <Button type="text" size="small" icon={<StarOutlined />} onClick={() => handleSetDefault(r.id)} />,
    },
    {
      title: '状态', dataIndex: 'status', width: 80,
      render: (v: string) => <Tag color={v === 'ACTIVE' ? 'green' : 'default'}>{v === 'ACTIVE' ? '启用' : '禁用'}</Tag>,
    },
    {
      title: '操作', width: 200,
      render: (_: any, r: any) => (
        <Space size="small">
          <Button type="link" size="small" icon={<ApiOutlined />}
                  loading={testLoading === r.id} onClick={() => handleTest(r.id)}>测试</Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(r)}>编辑</Button>
          <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(r.id)}>删除</Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ color: '#666', fontSize: 13 }}>
          管理 AI 模型配置，每个 Skill 可以指定使用不同的模型
        </div>
        <Button type="primary" icon={<PlusOutlined />}
                onClick={() => { setEditingId(null); form.resetFields(); setModalOpen(true); }}>
          新增模型
        </Button>
      </div>

      <Table columns={columns} dataSource={data} rowKey="id" loading={loading}
             pagination={{ current, total, pageSize: 20, onChange: p => { setCurrent(p); fetchData(p); } }}
             scroll={{ x: 1200 }} size="middle" />

      <Modal title={editingId ? '编辑模型' : '新增模型'} open={modalOpen} width={560} maskClosable={false}
             onOk={handleSave} onCancel={() => { setModalOpen(false); form.resetFields(); setEditingId(null); }}>
        <Form form={form} layout="vertical" initialValues={{ provider: 'OPENAI', temperature: 0.3, maxTokens: 4000, status: 'ACTIVE' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="modelCode" label="模型编码" rules={[{ required: true }]}>
              <Input disabled={!!editingId} placeholder="如 gpt-4o" />
            </Form.Item>
            <Form.Item name="modelName" label="显示名称" rules={[{ required: true }]}>
              <Input placeholder="如 GPT-4o" />
            </Form.Item>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="provider" label="提供商" rules={[{ required: true }]}>
              <Select>
                <Option value="OPENAI">OpenAI</Option>
                <Option value="AZURE">Azure OpenAI</Option>
                <Option value="DEEPSEEK">DeepSeek</Option>
                <Option value="OLLAMA">Ollama (本地)</Option>
              </Select>
            </Form.Item>
            <Form.Item name="status" label="状态">
              <Select>
                <Option value="ACTIVE">启用</Option>
                <Option value="INACTIVE">禁用</Option>
              </Select>
            </Form.Item>
          </div>
          <Form.Item name="baseUrl" label="Base URL">
            <Input placeholder="https://api.openai.com" />
          </Form.Item>
          <Form.Item name="apiKey" label="API Key">
            <Input.Password placeholder="sk-..." />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="temperature" label="温度">
              <InputNumber min={0} max={2} step={0.1} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="maxTokens" label="最大 Tokens">
              <InputNumber min={100} max={128000} step={100} style={{ width: '100%' }} />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default ModelConfig;
