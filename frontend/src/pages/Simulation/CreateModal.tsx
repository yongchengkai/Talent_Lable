import { useState } from 'react';
import { Modal, Form, Input, Button, Tag, message } from 'antd';
import { taskApi, ruleApi } from '@/services/api';
import RulePickerModal from '@/components/RulePickerModal';
import ScopeSelector, { ScopeValue } from '@/components/ScopeSelector';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateModal({ open, onClose, onSuccess }: Props) {
  const [form] = Form.useForm();
  const [scope, setScope] = useState<ScopeValue>({ type: 'CUSTOM', orgIds: [], employeeIds: [] });
  const [rulePickerOpen, setRulePickerOpen] = useState(false);
  const [selectedRuleIds, setSelectedRuleIds] = useState<number[]>([]);
  const [selectedRuleNames, setSelectedRuleNames] = useState<string[]>([]);

  const handleOk = async () => {
    const values = await form.validateFields();
    try {
      await taskApi.create({
        taskName: values.taskName,
        taskType: scope.type === 'FULL' ? 'FULL' : 'CUSTOM',
        taskMode: 'SIMULATION',
        taskScope: scope.type === 'FULL' ? null : JSON.stringify({ orgIds: scope.orgIds, employeeIds: scope.employeeIds }),
        triggeredBy: 'admin',
        ruleIds: selectedRuleIds,
      });
      message.success('创建成功');
      onSuccess();
      handleClose();
    } catch (e: any) { message.error(e.message); }
  };

  const handleClose = () => {
    form.resetFields();
    setScope({ type: 'FULL', orgIds: [], employeeIds: [] });
    setSelectedRuleIds([]); setSelectedRuleNames([]);
    onClose();
  };

  const handleRulePickerOk = async (ids: number[]) => {
    setSelectedRuleIds(ids);
    try {
      const res: any = await ruleApi.page({ current: 1, size: 100 });
      const allRules = res.data?.records || [];
      setSelectedRuleNames(ids.map(id => allRules.find((r: any) => r.id === id)?.ruleName || `规则#${id}`));
    } catch { setSelectedRuleNames(ids.map(id => `规则#${id}`)); }
    setRulePickerOpen(false);
  };

  return (
    <>
      <Modal title="新建模拟方案" open={open} width={860} maskClosable={false} destroyOnClose
             onOk={handleOk} onCancel={handleClose} okText="确定">
        <Form form={form} layout="vertical" initialValues={{ taskName: '模拟打标-' + new Date().toLocaleDateString() }}>
          <Form.Item name="taskName" label="方案名称" rules={[{ required: true }]}>
            <Input placeholder="输入方案名称" />
          </Form.Item>
          <Form.Item label="打标范围">
            <ScopeSelector value={scope} onChange={setScope} />
          </Form.Item>
          <Form.Item label="关联规则">
            <div>
              <Button onClick={() => setRulePickerOpen(true)} style={{ marginBottom: 8 }}>
                选择规则（已选 {selectedRuleIds.length} 条）
              </Button>
              {selectedRuleNames.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {selectedRuleNames.map((name, i) => (
                    <Tag key={i} closable onClose={() => {
                      setSelectedRuleIds(prev => prev.filter((_, idx) => idx !== i));
                      setSelectedRuleNames(prev => prev.filter((_, idx) => idx !== i));
                    }}>{name}</Tag>
                  ))}
                </div>
              ) : <span style={{ color: 'rgba(255,255,255,0.2)' }}>无关联规则</span>}
            </div>
          </Form.Item>
        </Form>
      </Modal>
      <RulePickerModal open={rulePickerOpen} value={selectedRuleIds}
                       onOk={handleRulePickerOk} onCancel={() => setRulePickerOpen(false)} />
    </>
  );
}
