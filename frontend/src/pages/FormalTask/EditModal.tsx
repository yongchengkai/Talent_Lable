import { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, Tag, message } from 'antd';
import { taskApi, ruleApi } from '@/services/api';
import RulePickerModal from '@/components/RulePickerModal';
import ScopeSelector, { ScopeValue } from '@/components/ScopeSelector';

interface Props {
  open: boolean;
  record: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditModal({ open, record, onClose, onSuccess }: Props) {
  const [form] = Form.useForm();
  const [scope, setScope] = useState<ScopeValue>({ type: 'FULL', orgIds: [], employeeIds: [] });
  const [rulePickerOpen, setRulePickerOpen] = useState(false);
  const [selectedRuleIds, setSelectedRuleIds] = useState<number[]>([]);
  const [selectedRuleNames, setSelectedRuleNames] = useState<string[]>([]);

  useEffect(() => {
    if (!open || !record) return;
    form.setFieldsValue({ taskName: record.taskName });
    if (record.taskScope && record.taskType !== 'FULL') {
      try {
        const parsed = JSON.parse(record.taskScope);
        setScope({ type: 'CUSTOM', orgIds: parsed.orgIds || [], employeeIds: parsed.employeeIds || [] });
      } catch { setScope({ type: 'FULL', orgIds: [], employeeIds: [] }); }
    } else {
      setScope({ type: 'FULL', orgIds: [], employeeIds: [] });
    }
    setSelectedRuleIds([]); setSelectedRuleNames([]);
    taskApi.getRules(record.id).then((res: any) => {
      const rules = res.data || [];
      setSelectedRuleIds(rules.map((r: any) => r.ruleId));
      setSelectedRuleNames(rules.map((r: any) => r.ruleName));
    }).catch(() => {});
  }, [open, record]);

  const handleOk = async () => {
    const values = await form.validateFields();
    try {
      await taskApi.update(record.id, {
        taskName: values.taskName,
        taskType: scope.type === 'FULL' ? 'FULL' : 'CUSTOM',
        taskScope: scope.type === 'FULL' ? null : JSON.stringify({ orgIds: scope.orgIds, employeeIds: scope.employeeIds }),
        ruleIds: selectedRuleIds,
      });
      message.success('更新成功');
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
      const res: any = await ruleApi.page({ current: 1, size: 100, status: 'PUBLISHED' });
      const allRules = res.data?.records || [];
      setSelectedRuleNames(ids.map(id => allRules.find((r: any) => r.id === id)?.ruleName || `规则#${id}`));
    } catch { setSelectedRuleNames(ids.map(id => `规则#${id}`)); }
    setRulePickerOpen(false);
  };

  return (
    <>
      <Modal title="编辑正式打标" open={open} width={860} maskClosable={false} destroyOnClose
             onOk={handleOk} onCancel={handleClose} okText="确定">
        <Form form={form} layout="vertical">
          <Form.Item name="taskName" label="任务名称" rules={[{ required: true }]}>
            <Input placeholder="输入任务名称" />
          </Form.Item>
          <Form.Item label="打标范围">
            <ScopeSelector value={scope} onChange={setScope} />
          </Form.Item>
          <Form.Item label="关联规则" extra="正式打标仅允许选择已发布状态的规则">
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
      <RulePickerModal open={rulePickerOpen} value={selectedRuleIds} publishedOnly
                       onOk={handleRulePickerOk} onCancel={() => setRulePickerOpen(false)} />
    </>
  );
}
