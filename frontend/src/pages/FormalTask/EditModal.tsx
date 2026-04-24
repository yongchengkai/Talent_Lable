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
  inline?: boolean;
}

export default function EditModal({ open, record, onClose, onSuccess, inline }: Props) {
  const [form] = Form.useForm();
  const [scope, setScope] = useState<ScopeValue>({ type: 'FULL', orgIds: [], employeeIds: [] });
  const [rulePickerOpen, setRulePickerOpen] = useState(false);
  const [selectedRuleIds, setSelectedRuleIds] = useState<number[]>([]);
  const [selectedRuleNames, setSelectedRuleNames] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if ((!open && !inline) || !record) return;
    let cancelled = false;
    const applyRecordValues = (source: any) => {
      form.setFieldsValue({ taskName: source.taskName || '' });
      if (source.taskScope && source.taskType !== 'FULL') {
        try {
          const parsed = typeof source.taskScope === 'string' ? JSON.parse(source.taskScope) : source.taskScope;
          setScope({ type: 'CUSTOM', orgIds: parsed.orgIds || [], employeeIds: parsed.employeeIds || [] });
        } catch {
          setScope({ type: 'FULL', orgIds: [], employeeIds: [] });
        }
      } else {
        setScope({ type: 'FULL', orgIds: [], employeeIds: [] });
      }
    };
    const doFill = async () => {
      setDone(false);
      setSelectedRuleIds([]);
      setSelectedRuleNames([]);
      let source = record;
      if (record.id) {
        try {
          const res: any = await taskApi.getById(record.id);
          source = { ...record, ...(res.data || {}) };
        } catch {}
      }
      if (cancelled) return;
      applyRecordValues(source);
      if (record.id) {
        taskApi.getRules(record.id).then((res: any) => {
          if (cancelled) return;
          const rules = res.data || [];
          setSelectedRuleIds(rules.map((r: any) => r.ruleId));
          setSelectedRuleNames(rules.map((r: any) => r.ruleName));
        }).catch(() => {});
      } else {
        const prefillRuleIds = Array.isArray(record.ruleIds) ? record.ruleIds : [];
        const prefillRuleNames = Array.isArray(record.ruleNames) ? record.ruleNames : [];
        setSelectedRuleIds(prefillRuleIds.map((id: any) => Number(id)).filter((id: number) => !Number.isNaN(id)));
        setSelectedRuleNames(prefillRuleNames.map((n: any) => String(n)));
      }
    };
    doFill();
    return () => { cancelled = true; };
  }, [open, inline, record]);

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
      if (inline) {
        setDone(true);
      } else {
        onSuccess();
        handleClose();
      }
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

  const formContent = (
    <Form form={form} layout="vertical" size={inline ? 'small' : undefined}>
      <Form.Item name="taskName" label={inline ? <span style={{ fontSize: 12 }}>任务名称</span> : '任务名称'} rules={[{ required: true }]}>
        <Input placeholder="输入任务名称" style={inline ? { fontSize: 12 } : undefined} />
      </Form.Item>
      <Form.Item label={inline ? <span style={{ fontSize: 12 }}>打标范围</span> : '打标范围'}>
        <ScopeSelector value={scope} onChange={setScope} />
      </Form.Item>
      <Form.Item label={inline ? <span style={{ fontSize: 12 }}>关联规则</span> : '关联规则'} extra={inline ? <span style={{ fontSize: 11 }}>正式打标仅允许选择已发布状态的规则</span> : '正式打标仅允许选择已发布状态的规则'}>
        <div>
          <Button onClick={() => setRulePickerOpen(true)} size={inline ? 'small' : undefined} style={{ marginBottom: 8, ...(inline ? { fontSize: 12 } : {}) }}>
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
  );

  if (inline) {
    if (!record?.id) {
      return (
        <div style={{ background: 'rgba(239,68,68,0.08)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)', padding: '12px 16px', margin: '8px 0' }}>
          <span style={{ color: '#ef4444', fontWeight: 500, fontSize: 13 }}>缺少任务 ID，无法编辑正式打标任务</span>
        </div>
      );
    }
    if (done) {
      return (
        <div style={{ background: 'rgba(16,185,129,0.08)', borderRadius: 8, border: '1px solid rgba(16,185,129,0.2)', padding: '12px 16px', margin: '8px 0' }}>
          <span style={{ color: '#10b981', fontWeight: 500, fontSize: 13 }}>✓ 正式打标任务更新成功</span>
        </div>
      );
    }
    return (
      <div style={{ width: '100%', maxWidth: '100%', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden', margin: '8px 0' }}>
        <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>编辑正式打标任务</span>
        </div>
        <div style={{ padding: '12px 16px' }}>
          {formContent}
          <div style={{ textAlign: 'right' }}>
            <Button type="primary" size="small" style={{ fontSize: 12 }} onClick={handleOk}>保存</Button>
          </div>
        </div>
        <RulePickerModal open={rulePickerOpen} value={selectedRuleIds} publishedOnly
                         onOk={handleRulePickerOk} onCancel={() => setRulePickerOpen(false)} />
      </div>
    );
  }

  return (
    <>
      <Modal title="编辑正式打标" open={open} width={860} maskClosable={false} destroyOnClose
             onOk={handleOk} onCancel={handleClose} okText="确定">
        {formContent}
      </Modal>
      <RulePickerModal open={rulePickerOpen} value={selectedRuleIds} publishedOnly
                       onOk={handleRulePickerOk} onCancel={() => setRulePickerOpen(false)} />
    </>
  );
}
