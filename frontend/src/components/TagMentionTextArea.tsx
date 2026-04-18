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

const TagMentionTextArea: React.FC<TagMentionTextAreaProps> = ({
  value = '', onChange, rows = 5, placeholder,
}) => {
  const [allTags, setAllTags] = useState<TagItem[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchText, setSearchText] = useState('');
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

  // 服务端分页加载标签
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
    if (showDropdown) fetchTags(currentPage, searchText);
  }, [showDropdown, currentPage, searchText]);

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

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const pos = e.target.selectionStart || 0;
    setCursorPos(pos);
    onChange?.(newValue);

    const textBefore = newValue.slice(0, pos);
    const lastHash = textBefore.lastIndexOf('#');
    if (lastHash >= 0) {
      const between = textBefore.slice(lastHash + 1);
      if (!between.includes('{') && !between.includes(' ') && !between.includes('\n')) {
        setHashStart(lastHash);
        setSearchText('');
        setCurrentPage(1);
        updatePanelPos();
        setShowDropdown(true);
        return;
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape' && showDropdown) {
      closePanel();
      e.stopPropagation();
    }
  };

  const closePanel = () => {
    setShowDropdown(false);
    setSearchText('');
    setCurrentPage(1);
    setHashStart(-1);
  };

  const selectTag = useCallback((tag: any) => {
    if (hashStart < 0) return;
    const before = value.slice(0, hashStart);
    const after = value.slice(cursorPos);
    const insertion = `#{${tag.tagName}（${tag.tagCode}）}`;
    const newValue = `${before}${insertion} ${after}`;
    onChange?.(newValue);
    setHashStart(-1);
    setTimeout(() => {
      const el = textAreaRef.current?.resizableTextArea?.textArea;
      if (el) {
        const newPos = hashStart + insertion.length + 1;
        el.focus();
        el.setSelectionRange(newPos, newPos);
      }
    }, 0);
  }, [hashStart, cursorPos, value, onChange]);

  const referencedTags = extractTagRefs(value, allTags);

  const panel = showDropdown ? createPortal(
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

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <Input.TextArea
        ref={textAreaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        rows={rows}
        placeholder={placeholder}
      />
      {panel}
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
