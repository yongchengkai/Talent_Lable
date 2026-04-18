import { useState, useCallback } from 'react';
import type { CSSProperties } from 'react';
import { Button, Input, Spin, Upload, message, Tag, Tabs, Table, Tooltip, Checkbox } from 'antd';
import {
  ThunderboltOutlined, UploadOutlined, ReloadOutlined, DownloadOutlined,
  CheckCircleOutlined, LoadingOutlined, ClockCircleOutlined,
  FileTextOutlined, FilePdfOutlined, FileExcelOutlined,
  FileWordOutlined, DeleteOutlined, EditOutlined, SendOutlined,
} from '@ant-design/icons';
import type { UploadFile } from 'antd';
import * as XLSX from 'xlsx';
import { aiApi } from '@/services/api';

/* ── Scenario Options ── */
const scenarioOptions = [
  { label: '人才筛选', value: '人才筛选' },
  { label: '人才对比', value: '人才对比' },
  { label: '人岗匹配', value: '人岗匹配' },
  { label: '人才评测', value: '人才评测' },
  { label: '其他', value: '其他' },
];

/* ── Types ── */
type StepStatus = 'wait' | 'process' | 'finish' | 'error';

interface PipelineStep {
  title: string;
  description: string;
  status: StepStatus;
  result?: string;
  tableData?: any[];
  tableColumns?: any[];
}

interface FileItem {
  uid: string;
  name: string;
  size: number;
  type: string;
}

const STEPS: PipelineStep[] = [
  { title: '分析业务场景', description: '理解需求、痛点和数据现状', status: 'wait' },
  { title: '设计标签类目', description: '规划标签分类体系', status: 'wait' },
  { title: '规划标签定义', description: '在各类目下定义具体标签', status: 'wait' },
  { title: '生成打标规则', description: '为标签设计结构化或AI语义规则', status: 'wait' },
  { title: '汇总导出', description: '整理方案并生成 Excel', status: 'wait' },
];

const fileIconMap: Record<string, any> = {
  pdf: <FilePdfOutlined style={{ color: '#ef4444' }} />,
  xls: <FileExcelOutlined style={{ color: '#10b981' }} />,
  xlsx: <FileExcelOutlined style={{ color: '#10b981' }} />,
  doc: <FileWordOutlined style={{ color: '#3b82f6' }} />,
  docx: <FileWordOutlined style={{ color: '#3b82f6' }} />,
  default: <FileTextOutlined style={{ color: '#8b5cf6' }} />,
};

const getFileIcon = (name: string) => {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return fileIconMap[ext] || fileIconMap.default;
};

const formatSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

/* ── Question card styles (matching prototype) ── */
const qCardStyle: CSSProperties = {
  display: 'grid', gap: 10, padding: 16, borderRadius: 14,
  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
};
const qHeadStyle: CSSProperties = { display: 'grid', gap: 4 };
const qLabelStyle: CSSProperties = { fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.92)' };
const qHintStyle: CSSProperties = { fontSize: 12, color: 'rgba(255,255,255,0.3)' };

/* ── Parse AI text into structured rows ── */
const parseSections = (text: string): { title: string; content: string; category?: string; type?: string; tags?: string }[] => {
  if (!text) return [];
  const lines = text.split('\n').filter(l => l.trim());
  const items: { title: string; content: string; category?: string; type?: string; tags?: string }[] = [];
  let current: any = null;
  for (const line of lines) {
    const match = line.match(/^(?:#{1,3}\s+|\d+[\.\)]\s*|[-*]\s+)(.+)/);
    if (match) {
      if (current) items.push(current);
      current = { title: match[1].trim(), content: '' };
    } else if (current) {
      current.content += (current.content ? '\n' : '') + line.trim();
    }
  }
  if (current) items.push(current);
  return items.length > 0 ? items : [{ title: '方案内容', content: text.slice(0, 200) }];
};

/* ══════════════════════════════════════════
   Component
   ══════════════════════════════════════════ */
export default function PlanningAgentPage() {
  const [scenarios, setScenarios] = useState<string[]>([]);
  const [customScenario, setCustomScenario] = useState('');
  const [audience, setAudience] = useState('');
  const [painPoints, setPainPoints] = useState('');
  const [constraints, setConstraints] = useState('');
  const [existingData, setExistingData] = useState('');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<PipelineStep[]>(STEPS);
  const [currentStep, setCurrentStep] = useState(-1);
  const [revisionInput, setRevisionInput] = useState('');
  const [revisionStep, setRevisionStep] = useState<number | null>(null);
  const [previewTab, setPreviewTab] = useState('categories');

  const allDone = steps.every(s => s.status === 'finish');
  const showOther = scenarios.includes('其他');

  const getScenarioText = () => [
    ...scenarios.filter(s => s !== '其他'),
    ...(showOther && customScenario.trim() ? [customScenario.trim()] : []),
  ].join('、');

  const buildContext = () => {
    const parts: string[] = [];
    const scenarioText = getScenarioText();
    if (scenarioText) parts.push(`业务场景：${scenarioText}`);
    if (audience.trim()) parts.push(`使用人群：${audience.trim()}`);
    if (painPoints.trim()) parts.push(`痛点：${painPoints.trim()}`);
    if (constraints.trim()) parts.push(`约束：${constraints.trim()}`);
    if (existingData.trim()) parts.push(`现有数据：\n${existingData.trim()}`);
    return parts.join('\n');
  };

  const handleReset = () => {
    setScenarios([]); setCustomScenario(''); setAudience(''); setPainPoints('');
    setConstraints(''); setExistingData('');
    setFiles([]); setFileList([]);
    setSteps(STEPS.map(s => ({ ...s }))); setCurrentStep(-1);
    setRevisionInput(''); setRevisionStep(null);
  };

  const handleUploadChange = (info: any) => {
    setFileList(info.fileList);
    const newFiles: FileItem[] = info.fileList.map((f: UploadFile) => ({
      uid: f.uid, name: f.name, size: f.size || 0, type: f.type || '',
    }));
    setFiles(newFiles);
  };

  const removeFile = (uid: string) => {
    setFiles(prev => prev.filter(f => f.uid !== uid));
    setFileList(prev => prev.filter(f => f.uid !== uid));
  };

  const updateStep = (index: number, patch: Partial<PipelineStep>) => {
    setSteps(prev => prev.map((s, i) => i === index ? { ...s, ...patch } : s));
  };

  const callAI = async (prompt: string, ctx: string) => {
    const res: any = await aiApi.planScheme({ scenario: prompt, painPoints: ctx, existingData });
    return res.data?.raw || JSON.stringify(res.data, null, 2);
  };

  /* ── Build table data from step results ── */
  const buildCategoryTable = (text: string) => {
    const rows = parseSections(text);
    return rows.map((r, i) => ({ key: i, code: `CAT_${String(i + 1).padStart(3, '0')}`, name: r.title, desc: r.content }));
  };

  const buildTagTable = (text: string) => {
    const rows = parseSections(text);
    return rows.map((r, i) => ({ key: i, code: `TAG_${String(i + 1).padStart(3, '0')}`, name: r.title, category: r.category || '-', type: r.type || 'STATIC_RULE', desc: r.content }));
  };

  const buildRuleTable = (text: string) => {
    const rows = parseSections(text);
    return rows.map((r, i) => ({ key: i, name: r.title, type: r.type || 'STRUCTURED', desc: r.content, tags: r.tags || '-' }));
  };

  /* ── Export Excel ── */
  const exportExcel = useCallback(() => {
    const wb = XLSX.utils.book_new();
    const catRows = parseSections(steps[1]?.result || '');
    const catSheet = XLSX.utils.aoa_to_sheet([
      ['类目编码', '类目名称', '说明'],
      ...catRows.map((r, i) => [`CAT_${String(i + 1).padStart(3, '0')}`, r.title, r.content]),
    ]);
    XLSX.utils.book_append_sheet(wb, catSheet, '标签类目');

    const tagRows = parseSections(steps[2]?.result || '');
    const tagSheet = XLSX.utils.aoa_to_sheet([
      ['标签编码', '标签名称', '所属类目', '生成方式', '说明'],
      ...tagRows.map((r, i) => [`TAG_${String(i + 1).padStart(3, '0')}`, r.title, r.category || '', r.type || 'STATIC_RULE', r.content]),
    ]);
    XLSX.utils.book_append_sheet(wb, tagSheet, '标签定义');

    const ruleRows = parseSections(steps[3]?.result || '');
    const ruleSheet = XLSX.utils.aoa_to_sheet([
      ['规则名称', '规则类型', '规则描述', '产出标签'],
      ...ruleRows.map(r => [r.title, r.type || 'STRUCTURED', r.content, r.tags || '']),
    ]);
    XLSX.utils.book_append_sheet(wb, ruleSheet, '打标规则');

    XLSX.writeFile(wb, `标签规划方案_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`);
  }, [steps]);

  /* ── Run pipeline ── */
  const handleGenerate = async () => {
    const ctx = buildContext();
    if (!ctx.trim() && files.length === 0) {
      message.warning('请至少填写一项业务信息'); return;
    }
    setRunning(true);
    const freshSteps = STEPS.map(s => ({ ...s }));
    setSteps(freshSteps);
    let prevResult = '';

    const prompts = [
      `请分析以下业务场景，总结核心需求、关键痛点和数据基础：\n${ctx}`,
      (prev: string) => `基于以下业务分析，设计标签类目体系。每个类目包含：类目名称、类目编码（CAT_前缀）、说明。请用列表格式输出：\n\n${prev}`,
      (prev: string) => `基于以下标签类目体系，为每个类目规划具体的标签定义。每个标签包含：标签名称、标签编码（TAG_前缀）、所属类目、生成方式（STATIC_RULE/STATIC_AI/DYNAMIC）、说明。请用列表格式输出：\n\n${prev}`,
      (prev: string) => `基于以下标签定义，为每个标签设计打标规则。结构化规则用条件表达式描述，AI语义规则用自然语言描述。每条规则包含：规则名称、规则类型（STRUCTURED/AI_SEMANTIC）、规则描述、产出标签。请用列表格式输出：\n\n${prev}`,
    ];

    try {
      for (let i = 0; i < 4; i++) {
        setCurrentStep(i);
        updateStep(i, { status: 'process' });
        const prompt = i === 0 ? (prompts[0] as string) : (prompts[i] as (p: string) => string)(prevResult);
        const result = await callAI(prompt, ctx);
        prevResult = result;
        freshSteps[i] = { ...freshSteps[i], status: 'finish', result };
        setSteps([...freshSteps]);
      }
      freshSteps[4] = { ...freshSteps[4], status: 'finish', result: '方案生成完成' };
      setSteps([...freshSteps]);
      setCurrentStep(5);
      message.success('标签规划方案生成完成');
    } catch (e: any) {
      const failIdx = freshSteps.findIndex(s => s.status === 'process');
      if (failIdx >= 0) freshSteps[failIdx] = { ...freshSteps[failIdx], status: 'error', result: '生成失败: ' + (e.message || '未知错误') };
      setSteps([...freshSteps]);
      message.error('生成失败: ' + (e.message || '未知错误'));
    } finally {
      setRunning(false);
    }
  };

  /* ── Revision for a single step ── */
  const handleRevision = async (stepIdx: number) => {
    if (!revisionInput.trim()) return;
    setRevisionStep(stepIdx);
    updateStep(stepIdx, { status: 'process' });
    try {
      const result = await callAI(
        `请根据以下修改意见，重新生成第${stepIdx + 1}步的内容：\n修改意见：${revisionInput}\n\n原内容：\n${steps[stepIdx].result}`,
        buildContext(),
      );
      updateStep(stepIdx, { status: 'finish', result });
      setRevisionInput('');
      setRevisionStep(null);
      message.success(`第${stepIdx + 1}步已更新`);
    } catch (e: any) {
      updateStep(stepIdx, { status: 'error' });
      message.error('修改失败: ' + (e.message || '未知错误'));
      setRevisionStep(null);
    }
  };

  const getStepIcon = (status: StepStatus) => {
    if (status === 'finish') return <CheckCircleOutlined style={{ color: '#10b981', fontSize: 18 }} />;
    if (status === 'process') return <LoadingOutlined style={{ color: '#22d3ee', fontSize: 18 }} />;
    if (status === 'error') return <span style={{ color: '#ef4444', fontSize: 18, fontWeight: 700 }}>✗</span>;
    return <ClockCircleOutlined style={{ color: 'rgba(255,255,255,0.15)', fontSize: 18 }} />;
  };

  /* ── Category / Tag / Rule table columns ── */
  const catCols = [
    { title: '编码', dataIndex: 'code', width: 120, render: (v: string) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#22d3ee' }}>{v}</span> },
    { title: '类目名称', dataIndex: 'name', width: 160 },
    { title: '说明', dataIndex: 'desc', ellipsis: true },
  ];
  const tagCols = [
    { title: '编码', dataIndex: 'code', width: 120, render: (v: string) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#22d3ee' }}>{v}</span> },
    { title: '标签名称', dataIndex: 'name', width: 140 },
    { title: '所属类目', dataIndex: 'category', width: 120 },
    { title: '生成方式', dataIndex: 'type', width: 120, render: (v: string) => <Tag color={v === 'STATIC_AI' ? 'purple' : v === 'DYNAMIC' ? 'blue' : 'cyan'}>{v}</Tag> },
    { title: '说明', dataIndex: 'desc', ellipsis: true },
  ];
  const ruleCols = [
    { title: '规则名称', dataIndex: 'name', width: 160 },
    { title: '类型', dataIndex: 'type', width: 130, render: (v: string) => <Tag color={v === 'AI_SEMANTIC' ? 'purple' : 'cyan'}>{v}</Tag> },
    { title: '规则描述', dataIndex: 'desc', ellipsis: true },
    { title: '产出标签', dataIndex: 'tags', width: 140 },
  ];

  /* ══════════════════════════════════════════
     Render
     ══════════════════════════════════════════ */
  const qCardStyle: React.CSSProperties = { padding: '14px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' };
  const qHeadStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 };
  const qLabelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)' };
  const qHintStyle: React.CSSProperties = { fontSize: 11, color: 'rgba(255,255,255,0.3)' };

  return (
    <div className="page-container">
      {/* ── Header ── */}
      <div style={{ marginBottom: 20 }}>
        <div className="page-subtitle">上传语料或填写业务背景，AI 智能体将分步分析并生成完整的标签规划方案，支持逐步修改和 Excel 导出</div>
      </div>

      {/* ══════════════════════════════════════
         Section 1: 语料输入 — 问卷式
         ══════════════════════════════════════ */}
      <div style={{
        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 16, padding: '24px 28px', marginBottom: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)', display: 'inline-block', boxShadow: '0 0 8px rgba(6,182,212,0.4)' }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.92)' }}>标签规划</span>
          </div>
          <Button size="small" icon={<ReloadOutlined />} onClick={handleReset} disabled={running}>重置</Button>
        </div>

        {/* Question cards stack */}
        <div style={{ display: 'grid', gap: 12 }}>
          {/* Q1: 业务场景 */}
          <div style={qCardStyle}>
            <div style={qHeadStyle}>
              <span style={qLabelStyle}>业务场景</span>
              <span style={qHintStyle}>可多选，勾选"其他"后可补充说明</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px 16px' }}>
              <Checkbox.Group
                options={scenarioOptions}
                value={scenarios}
                onChange={v => setScenarios(v as string[])}
                disabled={running}
                style={{ display: 'contents' }}
              />
            </div>
            {showOther && (
              <Input.TextArea
                rows={2} value={customScenario} onChange={e => setCustomScenario(e.target.value)}
                placeholder="填写其他业务场景" disabled={running} style={{ marginTop: 8 }}
              />
            )}
          </div>

          {/* Q2: 使用人群 */}
          <div style={qCardStyle}>
            <div style={qHeadStyle}>
              <span style={qLabelStyle}>使用人群</span>
              <span style={qHintStyle}>写清楚人群范围</span>
            </div>
            <Input.TextArea
              rows={3} value={audience} onChange={e => setAudience(e.target.value)}
              placeholder="写使用人群" disabled={running}
            />
          </div>

          {/* Q3: 当前业务痛点 */}
          <div style={qCardStyle}>
            <div style={qHeadStyle}>
              <span style={qLabelStyle}>当前业务痛点</span>
              <span style={qHintStyle}>描述当前最影响业务效果的问题</span>
            </div>
            <Input.TextArea
              rows={3} value={painPoints} onChange={e => setPainPoints(e.target.value)}
              placeholder="例如：标签口径不一致、模型版本多、岗位说明分散导致无法统一对齐" disabled={running}
            />
          </div>

          {/* Q4: 其他附件 */}
          <div style={qCardStyle}>
            <div style={qHeadStyle}>
              <span style={qLabelStyle}>其他附件</span>
              <span style={qHintStyle}>可上传当前人才模型、任职资格、岗位说明书等，建议优先使用 Markdown 格式</span>
            </div>
            <Upload
              fileList={fileList} onChange={handleUploadChange} beforeUpload={() => false}
              multiple accept=".md,.txt,.pdf,.doc,.docx" disabled={running}
              showUploadList={false}
            >
              <Button icon={<UploadOutlined />} size="small" disabled={running}>选择文件</Button>
            </Upload>
            {files.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                {files.map(f => (
                  <div key={f.uid} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 12px', borderRadius: 10,
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    <span style={{ fontSize: 16 }}>{getFileIcon(f.name)}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{formatSize(f.size)}</div>
                    </div>
                    <Tooltip title="移除"><DeleteOutlined onClick={() => removeFile(f.uid)} style={{ color: 'rgba(255,255,255,0.25)', cursor: 'pointer', fontSize: 13 }} /></Tooltip>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                marginTop: 8, padding: '10px 14px', borderRadius: 10,
                border: '1px dashed rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.25)', fontSize: 12,
              }}>
                未上传附件
              </div>
            )}
          </div>

          {/* Q5: 约束 */}
          <div style={qCardStyle}>
            <div style={qHeadStyle}>
              <span style={qLabelStyle}>约束</span>
              <span style={qHintStyle}>写清楚限制条件</span>
            </div>
            <Input.TextArea
              rows={3} value={constraints} onChange={e => setConstraints(e.target.value)}
              placeholder="写约束" disabled={running}
            />
          </div>

          {/* Q6: 现有数据 */}
          <div style={qCardStyle}>
            <div style={qHeadStyle}>
              <span style={qLabelStyle}>现有数据</span>
              <span style={qHintStyle}>请提供当前人员字段、字段描述和示例数据，建议使用 Markdown 格式</span>
            </div>
            <Input.TextArea
              rows={6} value={existingData} onChange={e => setExistingData(e.target.value)}
              placeholder={'示例（Markdown）：\n| 字段 | 字段描述 | 示例数据 |\n| --- | --- | --- |\n| grade | 职级 | P7 |\n| performance | 近一年绩效 | A |'}
              disabled={running}
              style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}
            />
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
          <Button icon={<ReloadOutlined />} onClick={handleReset} disabled={running}>重置</Button>
          <Button
            type="primary" icon={<ThunderboltOutlined />} loading={running} onClick={handleGenerate}
            style={{
              height: 42, fontSize: 14, fontWeight: 600, paddingInline: 28,
              background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)', border: 'none',
              boxShadow: '0 4px 16px rgba(6,182,212,0.25)',
            }}
          >
            {running ? '生成中...' : '生成'}
          </Button>
        </div>
      </div>

      {/* ══════════════════════════════════════
         Section 2: 智能体工作台
         ══════════════════════════════════════ */}
      {(currentStep >= 0 || running) && (
        <div style={{
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 16, padding: '24px 28px', marginBottom: 24,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: running ? 'linear-gradient(135deg, #f59e0b, #ef4444)' : allDone ? 'linear-gradient(135deg, #10b981, #06b6d4)' : 'rgba(255,255,255,0.15)',
              display: 'inline-block',
              boxShadow: running ? '0 0 8px rgba(245,158,11,0.4)' : 'none',
              animation: running ? 'pulse 1.5s ease-in-out infinite' : 'none',
            }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.92)' }}>
              {running ? '智能体分析中...' : allDone ? '分析完成' : '分析进度'}
            </span>
            {allDone && <Tag color="success">完成</Tag>}
          </div>

          {/* Timeline cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {steps.map((step, i) => (
              <div key={i} style={{
                borderRadius: 12, overflow: 'hidden',
                border: step.status === 'process' ? '1px solid rgba(34,211,238,0.15)' : step.status === 'finish' ? '1px solid rgba(16,185,129,0.1)' : step.status === 'error' ? '1px solid rgba(239,68,68,0.15)' : '1px solid rgba(255,255,255,0.04)',
                background: step.status === 'process' ? 'rgba(34,211,238,0.03)' : 'rgba(255,255,255,0.01)',
                transition: 'all 0.3s',
              }}>
                {/* Step header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
                  <div style={{ flexShrink: 0 }}>{getStepIcon(step.status)}</div>
                  <div style={{ flex: 1 }}>
                    <span style={{
                      fontWeight: 600, fontSize: 13,
                      color: step.status === 'finish' ? '#10b981' : step.status === 'process' ? '#22d3ee' : step.status === 'error' ? '#ef4444' : 'rgba(255,255,255,0.25)',
                    }}>
                      Step {i + 1} · {step.title}
                    </span>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', marginLeft: 10 }}>{step.description}</span>
                  </div>
                  {step.status === 'process' && <Spin size="small" />}
                </div>

                {/* Step result */}
                {step.result && step.status !== 'error' && i < 4 && (
                  <div style={{ padding: '0 16px 14px' }}>
                    {/* Structured table for steps 1-3 */}
                    {i === 1 && (
                      <Table size="small" dataSource={buildCategoryTable(step.result)} columns={catCols} pagination={false}
                        style={{ borderRadius: 8, overflow: 'hidden' }} />
                    )}
                    {i === 2 && (
                      <Table size="small" dataSource={buildTagTable(step.result)} columns={tagCols} pagination={false}
                        style={{ borderRadius: 8, overflow: 'hidden' }} />
                    )}
                    {i === 3 && (
                      <Table size="small" dataSource={buildRuleTable(step.result)} columns={ruleCols} pagination={false}
                        style={{ borderRadius: 8, overflow: 'hidden' }} />
                    )}
                    {/* Step 0: plain text */}
                    {i === 0 && (
                      <pre style={{
                        whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)', fontSize: 12,
                        maxHeight: 200, overflow: 'auto', lineHeight: 1.7,
                        background: 'rgba(255,255,255,0.02)', padding: 14, borderRadius: 8,
                        border: '1px solid rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.75)',
                        margin: 0,
                      }}>
                        {step.result}
                      </pre>
                    )}

                    {/* Revision input */}
                    {step.status === 'finish' && !running && (
                      <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                        <Input
                          size="small"
                          placeholder="输入修改意见，让 AI 重新生成此步..."
                          value={revisionStep === i ? revisionInput : ''}
                          onChange={e => { setRevisionStep(i); setRevisionInput(e.target.value); }}
                          onPressEnter={() => handleRevision(i)}
                          disabled={revisionStep !== null && revisionStep !== i}
                          style={{ flex: 1, fontSize: 12 }}
                          prefix={<EditOutlined style={{ color: 'rgba(255,255,255,0.2)' }} />}
                        />
                        <Button
                          size="small" type="primary" icon={<SendOutlined />}
                          onClick={() => handleRevision(i)}
                          disabled={revisionStep !== i || !revisionInput.trim()}
                          loading={revisionStep === i && (step.status as string) === 'process'}
                          style={{ fontSize: 12 }}
                        >
                          修改
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Error message */}
                {step.status === 'error' && step.result && (
                  <div style={{ padding: '0 16px 14px', color: '#ef4444', fontSize: 12 }}>{step.result}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
         Section 3: 导出预览
         ══════════════════════════════════════ */}
      {allDone && (
        <div style={{
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(16,185,129,0.12)',
          borderRadius: 16, padding: '24px 28px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #06b6d4)', display: 'inline-block', boxShadow: '0 0 8px rgba(16,185,129,0.4)' }} />
              <span style={{ fontSize: 15, fontWeight: 700, color: '#10b981' }}>导出预览</span>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>确认内容后导出 Excel</span>
            </div>
            <Button type="primary" icon={<DownloadOutlined />} onClick={exportExcel}
              style={{ background: 'linear-gradient(135deg, #10b981, #06b6d4)', border: 'none', boxShadow: '0 2px 10px rgba(16,185,129,0.25)' }}>
              导出 Excel
            </Button>
          </div>

          <Tabs
            activeKey={previewTab}
            onChange={setPreviewTab}
            items={[
              {
                key: 'categories',
                label: '标签类目',
                children: <Table size="small" dataSource={buildCategoryTable(steps[1]?.result || '')} columns={catCols} pagination={false} />,
              },
              {
                key: 'tags',
                label: '标签定义',
                children: <Table size="small" dataSource={buildTagTable(steps[2]?.result || '')} columns={tagCols} pagination={false} />,
              },
              {
                key: 'rules',
                label: '打标规则',
                children: <Table size="small" dataSource={buildRuleTable(steps[3]?.result || '')} columns={ruleCols} pagination={false} />,
              },
            ]}
          />
        </div>
      )}

      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  );
}
