import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Tag, Input, Button, Pagination, Empty } from 'antd';
import { SearchOutlined, CloseOutlined, FieldStringOutlined, TagOutlined } from '@ant-design/icons';
import { createPortal } from 'react-dom';
import { tagApi, categoryApi } from '@/services/api';

interface DslEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  rows?: number;
  placeholder?: string;
  showFieldActions?: boolean;
}

interface TagItem {
  id: number;
  tagCode: string;
  tagName: string;
  categoryName: string;
}

/** 可用的员工字段 */
const FIELD_OPTIONS = [
  { code: 'grade_level', label: '职级', type: 'string' },
  { code: 'org_name', label: '组织名称', type: 'string' },
  { code: 'org_id', label: '组织ID', type: 'number' },
  { code: 'position_sequence_code', label: '职位序列', type: 'string' },
  { code: 'job_family_code', label: '职族', type: 'string' },
  { code: 'job_title', label: '职务', type: 'string' },
  { code: 'education', label: '学历', type: 'string' },
  { code: 'university', label: '毕业院校', type: 'string' },
  { code: 'employment_type', label: '用工类型', type: 'string' },
  { code: 'employee_status', label: '员工状态', type: 'string' },
  { code: 'hire_date', label: '入职日期', type: 'date' },
  { code: 'birth_date', label: '出生日期', type: 'date' },
  { code: 'tenure_years', label: '司龄（年）', type: 'number' },
  { code: 'age', label: '年龄', type: 'number' },
];

/** 解析 DSL 中引用的标签，格式 #{标签名称（标签编码）} */
const parseTagRefs = (dsl: string): { tagName: string; tagCode: string }[] => {
  const matches = dsl.match(/#\{([^}]+)\}/g) || [];
  const results: { tagName: string; tagCode: string }[] = [];
  const seen = new Set<string>();
  for (const m of matches) {
    const inner = m.slice(2, -1);
    const match = inner.match(/^(.+?)（([A-Z0-9_]+)）$/);
    if (match && !seen.has(match[2])) {
      seen.add(match[2]);
      results.push({ tagName: match[1], tagCode: match[2] });
    }
  }
  return results;
};

const buildTagRef = (tag: TagItem): string => `#{${tag.tagName}（${tag.tagCode}）}`;

const PAGE_SIZE = 10;

type PanelType = 'tag' | 'field' | null;

const DslEditor: React.FC<DslEditorProps> = ({ value = '', onChange, rows = 8, placeholder, showFieldActions = true }) => {
  const [categories, setCategories] = useState<any[]>([]);
  const [panelType, setPanelType] = useState<PanelType>(null);
  const [searchText, setSearchText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [triggerPos, setTriggerPos] = useState(-1);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [totalTags, setTotalTags] = useState(0);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [fieldSearch, setFieldSearch] = useState('');
  const [panelPos, setPanelPos] = useState<{ top: number; left: number; width: number; direction: 'down' | 'up' }>({ top: 0, left: 0, width: 400, direction: 'down' });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    categoryApi.listActive().then((res: any) => setCategories(res.data || [])).catch(() => {});
  }, []);

  const catMap = Object.fromEntries(categories.map((c: any) => [c.id, c.categoryName]));

  const fetchTags = async (page: number, keyword: string) => {
    setTagsLoading(true);
    try {
      const res: any = await tagApi.page({ current: page, size: PAGE_SIZE, keyword, status: 'ACTIVE' });
      const records = res.data?.records || [];
      setTags(records.map((t: any) => ({
        id: t.id, tagCode: t.tagCode, tagName: t.tagName,
        categoryName: catMap[t.categoryId] || '未分类',
      })));
      setTotalTags(res.data?.total || 0);
    } catch { setTags([]); setTotalTags(0); }
    setTagsLoading(false);
  };

  useEffect(() => {
    if (panelType === 'tag') fetchTags(currentPage, searchText);
  }, [panelType, currentPage, searchText, categories]);

  const filteredFields = fieldSearch
    ? FIELD_OPTIONS.filter(f => f.code.includes(fieldSearch.toLowerCase()) || f.label.includes(fieldSearch))
    : FIELD_OPTIONS;

  const PANEL_HEIGHT = 420;

  const updatePanelPos = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const viewportH = window.innerHeight;
      const spaceBelow = viewportH - rect.bottom;
      const spaceAbove = rect.top;
      if (spaceBelow >= PANEL_HEIGHT || spaceBelow >= spaceAbove) {
        setPanelPos({ top: rect.bottom + 4, left: rect.left, width: rect.width, direction: 'down' });
      } else {
        setPanelPos({ top: rect.top - 4, left: rect.left, width: rect.width, direction: 'up' });
      }
    }
  };

  /** 在光标位置插入文本 */
  const insertAtCursor = useCallback((text: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const pos = triggerPos >= 0 ? triggerPos : ta.selectionStart;
    const afterStart = triggerPos >= 0 ? ta.selectionStart : ta.selectionStart;
    const before = value.slice(0, pos);
    const after = value.slice(afterStart);
    const newVal = before + text + after;
    onChange?.(newVal);
    setTriggerPos(-1);
    requestAnimationFrame(() => {
      if (ta) {
        const newPos = pos + text.length;
        ta.focus();
        ta.setSelectionRange(newPos, newPos);
      }
    });
  }, [value, onChange, triggerPos]);

  const insertTag = useCallback((tag: TagItem) => {
    insertAtCursor(buildTagRef(tag));
    closePanel();
  }, [insertAtCursor]);

  const insertField = useCallback((fieldCode: string) => {
    const fieldDef = FIELD_OPTIONS.find(f => f.code === fieldCode);
    const label = fieldDef ? fieldDef.label : fieldCode;
    insertAtCursor(`@{${label}（${fieldCode}）}`);
    closePanel();
  }, [insertAtCursor]);

  const openPanel = (type: PanelType) => {
    setSearchText('');
    setFieldSearch('');
    setCurrentPage(1);
    updatePanelPos();
    setPanelType(type);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    onChange?.(newVal);
    const pos = e.target.selectionStart;
    const charBefore = newVal[pos - 1];
    if (charBefore === '#' && (pos < 2 || newVal[pos - 2] !== '{')) {
      setTriggerPos(pos - 1);
      openPanel('tag');
    } else if (showFieldActions && charBefore === '@') {
      setTriggerPos(pos - 1);
      openPanel('field');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && panelType) {
      closePanel();
      e.stopPropagation();
    }
  };

  const closePanel = () => {
    setPanelType(null);
    setTriggerPos(-1);
    setSearchText('');
    setFieldSearch('');
    setCurrentPage(1);
  };

  /** 工具栏按钮点击：在光标位置触发面板 */
  const handleToolbarInsert = (type: PanelType) => {
    const ta = textareaRef.current;
    if (ta) {
      setTriggerPos(ta.selectionStart);
    }
    openPanel(type);
  };

  const refTags = parseTagRefs(value);

  // 标签选择面板
  const tagPanel = panelType === 'tag' ? createPortal(
    <div style={{
      position: 'fixed',
      ...(panelPos.direction === 'down'
        ? { top: panelPos.top }
        : { bottom: window.innerHeight - panelPos.top }),
      left: panelPos.left, width: panelPos.width,
      maxHeight: panelPos.direction === 'down'
        ? `calc(100vh - ${panelPos.top + 8}px)`
        : `${panelPos.top - 8}px`,
      zIndex: 9999, background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Tag color="cyan" style={{ margin: 0, fontSize: 11 }}>标签 #</Tag>
        <Input
          size="small" prefix={<SearchOutlined style={{ color: 'rgba(255,255,255,0.3)' }} />}
          placeholder="搜索标签名称或编码"
          value={searchText}
          onChange={e => { setSearchText(e.target.value); setCurrentPage(1); }}
          allowClear style={{ flex: 1 }} autoFocus
        />
        <Button type="text" size="small" icon={<CloseOutlined />} onClick={closePanel}
                style={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0 }} />
      </div>
      <div style={{ maxHeight: 320, overflow: 'auto' }}>
        {tagsLoading ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>加载中...</div>
        ) : tags.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="无匹配标签" style={{ padding: 24 }} />
        ) : (
          tags.map(tag => (
            <div key={tag.id} onMouseDown={e => e.preventDefault()} onClick={() => insertTag(tag)}
              style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'background 0.1s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(14,165,233,0.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
              <Tag color="cyan" style={{ margin: 0, fontSize: 12 }}>{tag.tagName}</Tag>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontFamily: 'monospace' }}>{tag.tagCode}</span>
              <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, marginLeft: 'auto' }}>{tag.categoryName}</span>
            </div>
          ))
        )}
      </div>
      {totalTags > PAGE_SIZE && (
        <div style={{ padding: '6px 12px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>共 {totalTags} 个标签</span>
          <Pagination size="small" current={currentPage} pageSize={PAGE_SIZE} total={totalTags}
                      onChange={p => setCurrentPage(p)} showSizeChanger={false} />
        </div>
      )}
    </div>,
    document.body
  ) : null;

  // 字段选择面板
  const fieldPanel = showFieldActions && panelType === 'field' ? createPortal(
    <div style={{
      position: 'fixed',
      ...(panelPos.direction === 'down'
        ? { top: panelPos.top }
        : { bottom: window.innerHeight - panelPos.top }),
      left: panelPos.left, width: panelPos.width,
      maxHeight: panelPos.direction === 'down'
        ? `calc(100vh - ${panelPos.top + 8}px)`
        : `${panelPos.top - 8}px`,
      zIndex: 9999, background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Tag color="blue" style={{ margin: 0, fontSize: 11 }}>字段 @</Tag>
        <Input
          size="small" prefix={<SearchOutlined style={{ color: 'rgba(255,255,255,0.3)' }} />}
          placeholder="搜索字段名称或编码"
          value={fieldSearch}
          onChange={e => setFieldSearch(e.target.value)}
          allowClear style={{ flex: 1 }} autoFocus
        />
        <Button type="text" size="small" icon={<CloseOutlined />} onClick={closePanel}
                style={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0 }} />
      </div>
      <div style={{ maxHeight: 320, overflow: 'auto' }}>
        {filteredFields.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="无匹配字段" style={{ padding: 24 }} />
        ) : (
          filteredFields.map(f => (
            <div key={f.code} onMouseDown={e => e.preventDefault()} onClick={() => insertField(f.code)}
              style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'background 0.1s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(14,165,233,0.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
              <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontFamily: 'monospace', minWidth: 180 }}>{f.code}</span>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>{f.label}</span>
              <Tag style={{ margin: 0, marginLeft: 'auto', fontSize: 10 }}>{f.type}</Tag>
            </div>
          ))
        )}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* 工具栏 */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6,
        padding: '4px 8px', borderRadius: 6,
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.04)',
      }}>
        {showFieldActions && (
          <>
            <Button size="small" type="text" onClick={() => handleToolbarInsert('field')}
              style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, padding: '0 8px', height: 24 }}>
              <span style={{ color: '#3b82f6', marginRight: 4 }}>@</span> 插入字段
            </Button>
            <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.08)' }} />
          </>
        )}
        <Button size="small" type="text" onClick={() => handleToolbarInsert('tag')}
          style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, padding: '0 8px', height: 24 }}>
          <span style={{ color: '#06b6d4', marginRight: 4 }}>#</span> 插入标签
        </Button>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>
          {showFieldActions ? '输入 @ 或 # 也可触发' : '输入 # 也可触发'}
        </span>
      </div>

      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        rows={rows}
        placeholder={placeholder || (showFieldActions ? '输入规则 DSL（JSON 格式），输入 @ 插入字段，输入 # 插入标签' : '输入规则 DSL（JSON 格式），输入 # 插入标签')}
        spellCheck={false}
        style={{
          width: '100%', resize: 'vertical', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8, padding: '8px 12px', fontSize: 13, lineHeight: 1.7,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.85)',
          outline: 'none', transition: 'border-color 0.2s',
        }}
        onFocus={e => { e.target.style.borderColor = 'rgba(14,165,233,0.5)'; }}
        onBlurCapture={e => { (e.target as HTMLTextAreaElement).style.borderColor = 'rgba(255,255,255,0.1)'; }}
      />
      {tagPanel}
      {fieldPanel}
      <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', minHeight: 24 }}>
        {refTags.length > 0 ? (
          <>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>引用标签 ({refTags.length})：</span>
            {refTags.map(t => (
              <Tag key={t.tagCode} color="cyan" style={{ margin: 0, fontSize: 11 }}>{t.tagName}</Tag>
            ))}
          </>
        ) : (
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>{'标签格式：#{标签名称（标签编码）}'}</span>
        )}
      </div>
    </div>
  );
};

export default DslEditor;
export { parseTagRefs, FIELD_OPTIONS };
