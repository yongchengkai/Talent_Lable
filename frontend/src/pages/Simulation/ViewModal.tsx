import { useState, useEffect } from 'react';
import { Modal, Form, Input, Tag } from 'antd';
import { taskApi } from '@/services/api';
import ScopeSelector, { ScopeValue } from '@/components/ScopeSelector';

interface Props {
  open: boolean;
  record: any;
  onClose: () => void;
}

export default function ViewModal({ open, record, onClose }: Props) {
  const [scope, setScope] = useState<ScopeValue>({ type: 'FULL', orgIds: [], employeeIds: [] });
  const [ruleNames, setRuleNames] = useState<string[]>([]);

  useEffect(() => {
    if (!open || !record) return;
    if (record.taskScope && record.taskType !== 'FULL') {
      try {
        const parsed = JSON.parse(record.taskScope);
        setScope({ type: 'CUSTOM', orgIds: parsed.orgIds || [], employeeIds: parsed.employeeIds || [] });
      } catch { setScope({ type: 'FULL', orgIds: [], employeeIds: [] }); }
    } else {
      setScope({ type: 'FULL', orgIds: [], employeeIds: [] });
    }
    setRuleNames([]);
    taskApi.getRules(record.id).then((res: any) => {
      setRuleNames((res.data || []).map((r: any) => r.ruleName));
    }).catch(() => {});
  }, [open, record]);

  return (
    <Modal title="模拟方案详情" open={open} width={860} maskClosable={false} destroyOnClose
           onOk={onClose} onCancel={onClose} okText="关闭" cancelButtonProps={{ style: { display: 'none' } }}>
      <Form layout="vertical">
        <Form.Item label="方案名称">
          <Input value={record?.taskName} disabled />
        </Form.Item>
        <Form.Item label="打标范围">
          <ScopeSelector value={scope} onChange={() => {}} disabled />
        </Form.Item>
        <Form.Item label="关联规则">
          {ruleNames.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {ruleNames.map((name, i) => <Tag key={i}>{name}</Tag>)}
            </div>
          ) : <span style={{ color: 'rgba(255,255,255,0.2)' }}>无关联规则</span>}
        </Form.Item>
      </Form>
    </Modal>
  );
}
