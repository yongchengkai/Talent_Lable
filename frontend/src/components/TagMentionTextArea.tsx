import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Input, Tag, Empty, Button, Pagination } from 'antd';
import { SearchOutlined, CloseOutlined } from '@ant-design/icons';
import { createPortal } from 'react-dom';
import { tagApi, categoryApi } from '@/services/api';

interface TagMentionTextAreaProps {
  value?: string;
  onChange?: (value: string) => void;
  rows?: number;
  placeholder?: string;
}

interface TagItem {
  id: number;
  tagCode: string;
  tagName: string;
  categoryId: number;
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
  { code: 'resume_text', label: '简历', type: 'text' },
  { code: 'project_experience', label: '项目经历', type: 'text' },
];

/** 从文本中提取 #{标签名称（标签编码）} 格式的引用 */
export function extractTagRefs(text: string, allTags: TagItem[]): TagItem[] {
  if (!text) return [];
  const regex = /#\{([^}]+?)（([^)]+?)）\}/g;
  const found: TagItem[] = [];
  const seen = new Set<number>();
  let match;
  while ((match = regex.exec(text)) !== null) {
    const tagName = match[1];
    const tagCode = match[2];
    const tag = allTags.find(t => t.tagCode === tagCode || t.tagName === tagName);
    if (tag && !seen.has(tag.id)) {
      found.push(tag);
      seen.add(tag.id);
    }
  }
  return found;
}

const PAGE_SIZE = 10;

type PanelType = 'tag' | 'field' | null;

const TagMentionTextArea: React.FC<TagMentionTextAreaProps> = ({
  value = '', onChange, rows = 5, placeholder,
}) => {
  const [allTags, setAllTags] = useState<TagItem[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [panelType, setPanelType] = useState<PanelType>(null);
  const [searchText, setSearchText] = useState('');
  const [fieldSearch, setFieldSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [tags, setTags] = useState<any[]>([]);
  const [totalTags, setTotalTags] = useState(0);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [cursorPos, setCursorPos] = useState(0);
  const [hashStart, setHashStart] = useState(-1);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number; width: number; direction: 'down' | 'up' }>({ top: 0, left: 0, width: 400, direction: 'down' });
  const textAreaRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [tagRes, catRes]: any[] = await Promise.all([
          tagApi.page({ current: 1, size: 500, status: 'ACTIVE' }),
          categoryApi.listActive(),
        ]);
        setAllTags(tagRes.data?.records || []);
        setCategories(catRes.data || []);
      } catch {}
    };
    load();
  }, []);

  const catMap = Object.fromEntries(categories.map((c: any) => [c.id, c.categoryName]));

  const fetchTags = async (page: number, keyword: string) => {
    setTagsLoading(true);
    try {
      const res: any = await tagApi.page({ current: page, size: PAGE_SIZE, keyword, status: 'ACTIVE' });
      setTags(res.data?.records || []);
      setTotalTags(res.data?.total || 0);
    } catch { setTags([]); setTotalTags(0); }
    setTagsLoading(false);
  };

  useEffect(() => {
    if (panelType === 'tag') fetchTags(currentPage, searchText);
  }, [panelType, currentPage, searchText]);

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

  const insertAtCursor = useCallback((text: string) => {
    const el = textAreaRef.current?.resizableTextArea?.textArea;
    if (!el) return;
    const pos = hashStart >= 0 ? hashStart : cursorPos;
    const before = value.slice(0, pos);
    const after = value.slice(cursorPos);
    const newValue = `${before}${text} ${after}`;
    onChange?.(newValue);
    setHashStart(-1);
    setTimeout(() => {
      if (el) {
        const newPos = pos + text.length + 1;
        el.focus();
        el.setSelectionRange(newPos, newPos);
      }
    }, 0);
  }, [hashStart, cursorPos, value, onChange]);

  const selectTag = useCallback((tag: any) => {
    insertAtCursor(`#{${tag.tagName}（${tag.tagCode}）}`);
    closePanel();
  }, [insertAtCursor]);

  const selectField = useCallback((fieldCode: string) => {
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
    const newValue = e.target.value;
    const pos = e.target.selectionStart || 0;
    setCursorPos(pos);
    onChange?.(newValue);

    const textBefore = newValue.slice(0, pos);
    const charBefore = newValue[pos - 1];

    if (charBefore === '#' && (pos < 2 || newValue[pos - 2] !== '{')) {
      setHashStart(pos - 1);
      openPanel('tag');
      return;
    }
    if (charBefore === '@') {
      setHashStart(pos - 1);
      openPanel('field');
      return;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape' && panelType) {
      closePanel();
      e.stopPropagation();
    }
  };

  const closePanel = () => {
    setPanelType(null);
    setSearchText('');
    setFieldSearch('');
    setCurrentPage(1);
    setHashStart(-1);
  };

  const handleToolbarInsert = (type: PanelType) => {
    const el = textAreaRef.current?.resizableTextArea?.textArea;
    if (el) {
      setHashStart(el.selectionStart);
      setCursorPos(el.selectionStart);
    }
    openPanel(type);
  };

  const referencedTags = extractTagRefs(value, allTags);

  // 标签选择面板
  const tagPanel = panelType === 'tag' ? createPortal(
    <div style={{
      position: 'fixed',
      ...(panelPos.direction === 'down' ? { top: panelPos.top } : { bottom: window.innerHeight - panelPos.top }),
      left: panelPos.left, width: panelPos.width,
      maxHeight: panelPos.direction === 'down' ? `calc(100vh - ${panelPos.top + 8}px)` : `${panelPos.top - 8}px`,
      zIndex: 9999, background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Tag color="cyan" style={{ margin: 0, fontSize: 11 }}>标签 #</Tag>
        <Input size="small" prefix={<SearchOutlined style={{ color: 'rgba(255,255,255,0.3)' }} />}
          placeholder="搜索标签名称或编码" value={searchText}
          onChange={e => { setSearchText(e.target.value); setCurrentPage(1); }}
          allowClear style={{ flex: 1 }} autoFocus />
        <Button type="text" size="small" icon={<CloseOutlined />} onClick={closePanel} style={{ color: 'rgba(255,255,255,0.4)' }} />
      </div>
      <div style={{ maxHeight: 320, overflow: 'auto' }}>
        {tagsLoading ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>加载中...</div>
        ) : tags.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="无匹配标签" style={{ padding: 24 }} />
        ) : (
          tags.map((tag: any) => (
            <div key={tag.id} onMouseDown={e => e.preventDefault()} onClick={() => selectTag(tag)}
              style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'background 0.1s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(14,165,233,0.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
              <Tag color="cyan" style={{ margin: 0, fontSize: 12 }}>{tag.tagName}</Tag>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>{tag.tagCode}</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginLeft: 'auto' }}>{catMap[tag.categoryId] || ''}</span>
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
  const fieldPanel = panelType === 'field' ? createPortal(
    <div style={{
      position: 'fixed',
      ...(panelPos.direction === 'down' ? { top: panelPos.top } : { bottom: window.innerHeight - panelPos.top }),
      left: panelPos.left, width: panelPos.width,
      maxHeight: panelPos.direction === 'down' ? `calc(100vh - ${panelPos.top + 8}px)` : `${panelPos.top - 8}px`,
      zIndex: 9999, background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Tag color="blue" style={{ margin: 0, fontSize: 11 }}>字段 @</Tag>
        <Input size="small" prefix={<SearchOutlined style={{ color: 'rgba(255,255,255,0.3)' }} />}
          placeholder="搜索字段名称或编码" value={fieldSearch}
          onChange={e => setFieldSearch(e.target.value)}
          allowClear style={{ flex: 1 }} autoFocus />
        <Button type="text" size="small" icon={<CloseOutlined />} onClick={closePanel} style={{ color: 'rgba(255,255,255,0.4)' }} />
      </div>
      <div style={{ maxHeight: 320, overflow: 'auto' }}>
        {filteredFields.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="无匹配字段" style={{ padding: 24 }} />
        ) : (
          filteredFields.map(f => (
            <div key={f.code} onMouseDown={e => e.preventDefault()} onClick={() => selectField(f.code)}
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
        <Button size="small" type="text" onClick={() => handleToolbarInsert('field')}
          style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, padding: '0 8px', height: 24 }}>
          <span style={{ color: '#3b82f6', marginRight: 4 }}>@</span> 插入字段
        </Button>
        <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.08)' }} />
        <Button size="small" type="text" onClick={() => handleToolbarInsert('tag')}
          style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, padding: '0 8px', height: 24 }}>
          <span style={{ color: '#06b6d4', marginRight: 4 }}>#</span> 插入标签
        </Button>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>
          输入 @ 或 # 也可触发
        </span>
      </div>

      <Input.TextArea
        ref={textAreaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        rows={rows}
        placeholder={placeholder}
      />
      {tagPanel}
      {fieldPanel}
      {/* 引用的标签展示 */}
      {referencedTags.length > 0 && (
        <div style={{
          marginTop: 8, padding: '8px 12px',
          background: 'rgba(255,255,255,0.02)', borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.04)',
        }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 6 }}>
            引用标签（{referencedTags.length}）
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {referencedTags.map(t => (
              <Tag key={t.id} color="cyan" style={{ fontSize: 12 }}>
                {t.tagName}
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginLeft: 4 }}>{t.tagCode}</span>
              </Tag>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TagMentionTextArea;
