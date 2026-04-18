import React, { useState, useEffect } from 'react';
import { Select, Input, Button, Tag, Space, Tooltip } from 'antd';
import { PlusOutlined, DeleteOutlined, CopyOutlined } from '@ant-design/icons';
import { tagApi, categoryApi } from '@/services/api';

const { Option } = Select;

/** 员工字段选项 */
const FIELD_OPTIONS = [
  { label: '职级', value: 'grade_level', type: 'string' },
  { label: '组织名称', value: 'org_name', type: 'string' },
  { label: '职位序列', value: 'position_sequence_code', type: 'string' },
  { label: '职族', value: 'job_family_code', type: 'string' },
  { label: '职务', value: 'job_title', type: 'string' },
  { label: '学历', value: 'education', type: 'string' },
  { label: '毕业院校', value: 'university', type: 'string' },
  { label: '用工类型', value: 'employment_type', type: 'string' },
  { label: '员工状态', value: 'employee_status', type: 'string' },
  { label: '入职日期', value: 'hire_date', type: 'date' },
  { label: '出生日期', value: 'birth_date', type: 'date' },
  { label: '司龄（年）', value: 'tenure_years', type: 'number' },
  { label: '年龄', value: 'age', type: 'number' },
];

/** 运算符选项 */
const OP_OPTIONS = [
  { label: '等于', value: 'EQ' },
  { label: '不等于', value: 'NE' },
  { label: '大于', value: 'GT' },
  { label: '大于等于', value: 'GE' },
  { label: '小于', value: 'LT' },
  { label: '小于等于', value: 'LE' },
  { label: '在列表中', value: 'IN' },
  { label: '不在列表中', value: 'NOT_IN' },
  { label: '区间', value: 'BETWEEN' },
  { label: '模糊匹配', value: 'LIKE' },
];

interface Condition {
  field: string;
  op: string;
  value: string;
}

interface DslData {
  conditions: Condition[];
  logic: 'AND' | 'OR';
  outputs: string[];
}

interface StructuredDslEditorProps {
  value?: string;
  onChange?: (value: string) => void;
}

/** 解析 JSON DSL 字符串 */
function parseDsl(dsl: string): DslData {
  try {
    const parsed = JSON.parse(dsl);
    return {
      conditions: parsed.conditions || [],
      logic: parsed.logic || 'AND',
      outputs: parsed.outputs || [],
    };
  } catch {
    return { conditions: [{ field: '', op: 'EQ', value: '' }], logic: 'AND', outputs: [] };
  }
}

/** 序列化为 JSON 字符串 */
function serializeDsl(data: DslData): string {
  return JSON.stringify(data, null, 2);
}

/** 从 outputs 中提取标签引用 */
function extractOutputTags(outputs: string[]): { tagName: string; tagCode: string }[] {
  const result: { tagName: string; tagCode: string }[] = [];
  for (const o of outputs) {
    const m = o.match(/^#\{(.+?)（([A-Z0-9_]+)）\}$/);
    if (m) result.push({ tagName: m[1], tagCode: m[2] });
  }
  return result;
}

const StructuredDslEditor: React.FC<StructuredDslEditorProps> = ({ value = '', onChange }) => {
  const [data, setData] = useState<DslData>(() => parseDsl(value));
  const [allTags, setAllTags] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [showJson, setShowJson] = useState(false);

  useEffect(() => {
    Promise.all([
      tagApi.page({ current: 1, size: 500, status: 'ACTIVE' }),
      categoryApi.listActive(),
    ]).then(([tagRes, catRes]: any[]) => {
      setAllTags(tagRes.data?.records || []);
      setCategories(catRes.data || []);
    }).catch(() => {});
  }, []);

  // 外部 value 变化时同步（如 AI 生成）
  useEffect(() => {
    if (value) {
      try {
        const parsed = JSON.parse(value);
        if (parsed.conditions) setData(parsed);
      } catch {}
    }
  }, [value]);

  const catMap = Object.fromEntries(categories.map((c: any) => [c.id, c.categoryName]));

  const emit = (newData: DslData) => {
    setData(newData);
    onChange?.(serializeDsl(newData));
  };

  // 条件操作
  const addCondition = () => {
    emit({ ...data, conditions: [...data.conditions, { field: '', op: 'EQ', value: '' }] });
  };

  const removeCondition = (index: number) => {
    const next = data.conditions.filter((_, i) => i !== index);
    emit({ ...data, conditions: next.length > 0 ? next : [{ field: '', op: 'EQ', value: '' }] });
  };

  const updateCondition = (index: number, key: keyof Condition, val: string) => {
    const next = [...data.conditions];
    next[index] = { ...next[index], [key]: val };
    emit({ ...data, conditions: next });
  };

  const setLogic = (logic: 'AND' | 'OR') => {
    emit({ ...data, logic });
  };

  // 标签选择
  const addOutput = (tagId: number) => {
    const tag = allTags.find(t => t.id === tagId);
    if (!tag) return;
    const ref = `#{${tag.tagName}（${tag.tagCode}）}`;
    if (data.outputs.includes(ref)) return;
    emit({ ...data, outputs: [...data.outputs, ref] });
  };

  const removeOutput = (index: number) => {
    emit({ ...data, outputs: data.outputs.filter((_, i) => i !== index) });
  };

  const getFieldLabel = (field: string) => FIELD_OPTIONS.find(f => f.value === field)?.label || field;
  const getOpLabel = (op: string) => OP_OPTIONS.find(o => o.value === op)?.label || op;

  const getValuePlaceholder = (op: string) => {
    if (op === 'IN' || op === 'NOT_IN') return '多个值用逗号分隔，如 P7,P8,P9';
    if (op === 'BETWEEN') return '两个值用逗号分隔，如 20,25';
    return '输入比较值';
  };

  const outputTags = extractOutputTags(data.outputs);

  // 按类目分组的标签选项
  const tagOptions = (() => {
    const grouped: Record<string, any[]> = {};
    for (const tag of allTags) {
      const catName = catMap[tag.categoryId] || '未分类';
      if (!grouped[catName]) grouped[catName] = [];
      grouped[catName].push(tag);
    }
    return Object.entries(grouped).map(([catName, tags]) => ({
      label: catName,
      options: tags.map(t => ({ label: `${t.tagName}（${t.tagCode}）`, value: t.id })),
    }));
  })();

  return (
    <div>
      {/* 条件区 */}
      <div style={{
        padding: 12, borderRadius: 8,
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        marginBottom: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.7)' }}>条件</span>
            <Select size="small" value={data.logic} onChange={setLogic} style={{ width: 80 }}>
              <Option value="AND">且（AND）</Option>
              <Option value="OR">或（OR）</Option>
            </Select>
          </div>
          <Button size="small" icon={<PlusOutlined />} onClick={addCondition}>添加条件</Button>
        </div>

        {data.conditions.map((cond, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
            {i > 0 && (
              <span style={{ fontSize: 11, color: '#0ea5e9', width: 32, textAlign: 'center', flexShrink: 0 }}>
                {data.logic}
              </span>
            )}
            {i === 0 && <span style={{ width: 32, flexShrink: 0 }} />}
            <Select
              size="small" placeholder="选择字段" value={cond.field || undefined}
              onChange={v => updateCondition(i, 'field', v)}
              style={{ width: 130 }}
              options={FIELD_OPTIONS.map(f => ({ label: f.label, value: f.value }))}
            />
            <Select
              size="small" placeholder="运算符" value={cond.op || undefined}
              onChange={v => updateCondition(i, 'op', v)}
              style={{ width: 110 }}
              options={OP_OPTIONS}
            />
            <Input
              size="small" placeholder={getValuePlaceholder(cond.op)}
              value={cond.value}
              onChange={e => updateCondition(i, 'value', e.target.value)}
              style={{ flex: 1 }}
            />
            <Button size="small" type="text" icon={<DeleteOutlined />}
              onClick={() => removeCondition(i)}
              style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}
              disabled={data.conditions.length <= 1}
            />
          </div>
        ))}
      </div>

      {/* 输出标签区 */}
      <div style={{
        padding: 12, borderRadius: 8,
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        marginBottom: 12,
      }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>
          命中后输出标签
        </div>
        <Select
          placeholder="选择输出标签"
          style={{ width: '100%', marginBottom: 8 }}
          size="small"
          options={tagOptions}
          onChange={addOutput}
          value={undefined}
          optionFilterProp="label"
          showSearch
        />
        {outputTags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {outputTags.map((t, i) => (
              <Tag key={t.tagCode} color="cyan" closable onClose={() => removeOutput(i)} style={{ fontSize: 12 }}>
                {t.tagName}
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginLeft: 4 }}>{t.tagCode}</span>
              </Tag>
            ))}
          </div>
        )}
      </div>

      {/* JSON 预览 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <a onClick={() => setShowJson(!showJson)}
          style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', cursor: 'pointer' }}>
          {showJson ? '收起 JSON' : '查看 JSON'}
        </a>
        {showJson && (
          <Tooltip title="复制 JSON">
            <CopyOutlined style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}
              onClick={() => { navigator.clipboard.writeText(serializeDsl(data)); }} />
          </Tooltip>
        )}
      </div>
      {showJson && (
        <pre style={{
          background: 'rgba(0,0,0,0.3)', padding: 12, borderRadius: 8,
          fontSize: 12, fontFamily: "'JetBrains Mono', monospace",
          color: 'rgba(255,255,255,0.6)', maxHeight: 200, overflow: 'auto',
          border: '1px solid rgba(255,255,255,0.06)',
          whiteSpace: 'pre-wrap', wordBreak: 'break-all',
        }}>
          {serializeDsl(data)}
        </pre>
      )}

      {/* 规则摘要 */}
      {data.conditions.some(c => c.field && c.value) && (
        <div style={{
          marginTop: 8, padding: '8px 12px', borderRadius: 8,
          background: 'rgba(14,165,233,0.04)',
          border: '1px solid rgba(14,165,233,0.1)',
          fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.8,
        }}>
          当{data.conditions.filter(c => c.field && c.value).map((c, i) => (
            <span key={i}>
              {i > 0 && <span style={{ color: '#0ea5e9' }}> {data.logic === 'AND' ? '且' : '或'} </span>}
              <span style={{ color: 'rgba(255,255,255,0.7)' }}>{getFieldLabel(c.field)}</span>
              <span style={{ color: '#0ea5e9' }}> {getOpLabel(c.op)} </span>
              <span style={{ color: 'rgba(255,255,255,0.7)' }}>{c.value}</span>
            </span>
          ))}
          {outputTags.length > 0 && (
            <span>，输出 {outputTags.map(t => <Tag key={t.tagCode} color="cyan" style={{ fontSize: 11, margin: '0 2px' }}>{t.tagName}</Tag>)}</span>
          )}
        </div>
      )}
    </div>
  );
};

export default StructuredDslEditor;
export { parseDsl, serializeDsl, extractOutputTags, FIELD_OPTIONS, OP_OPTIONS };
