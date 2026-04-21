import React, { useState, useEffect, useRef } from 'react';
import { Menu, Button, message, Spin, Modal } from 'antd';
import { FileTextOutlined, EditOutlined, SaveOutlined, EyeOutlined, FullscreenOutlined, CloseOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { docApi } from '@/services/api';

interface DocItem {
  filename: string;
  name: string;
}

const ProductDocs: React.FC = () => {
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [activeFile, setActiveFile] = useState('');
  const [content, setContent] = useState('');
  const [editContent, setEditContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollTopRef = useRef(0);

  const loadDocList = async () => {
    try {
      const res: any = await docApi.list();
      const list: DocItem[] = res.data || [];
      setDocs(list);
      if (list.length > 0 && !activeFile) {
        setActiveFile(list[0].filename);
      }
    } catch { message.error('加载文档列表失败'); }
  };

  const loadDoc = async (filename: string) => {
    setLoading(true);
    setEditing(false);
    try {
      const res: any = await docApi.read(filename);
      const text = res.data?.content || '';
      setContent(text);
      setEditContent(text);
    } catch (e: any) {
      setContent('> 文档加载失败');
      setEditContent('');
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!activeFile) return;
    if (textareaRef.current) scrollTopRef.current = textareaRef.current.scrollTop;
    setSaving(true);
    try {
      await docApi.save(activeFile, editContent);
      setContent(editContent);
      setEditing(false);
      message.success('保存成功');
      requestAnimationFrame(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollTopRef.current; });
    } catch (e: any) {
      message.error('保存失败: ' + (e.message || '未知错误'));
    }
    setSaving(false);
  };

  useEffect(() => { loadDocList(); }, []);
  useEffect(() => { if (activeFile) loadDoc(activeFile); }, [activeFile]);

  const isHtml = activeFile.toLowerCase().endsWith('.html');
  const displayName = docs.find(d => d.filename === activeFile)?.name || activeFile;

  /** 渲染文档内容（内联区和弹窗共用） */
  const renderContent = (inModal?: boolean) => {
    if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><Spin /></div>;
    if (isHtml) {
      return (
        <iframe
          srcDoc={content}
          style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }}
          sandbox="allow-same-origin allow-scripts"
        />
      );
    }
    return (
      <div className="markdown-body markdown-body-dark doc-reader" style={inModal ? { padding: '24px 40px' } : undefined}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 180px)', gap: 0 }}>
      {/* 左侧文档列表 */}
      <div style={{
        width: 220, flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(255,255,255,0.02)', borderRadius: '8px 0 0 8px', overflow: 'auto',
      }}>
        <div style={{
          padding: '16px 16px 12px', fontSize: 13, fontWeight: 600,
          color: 'rgba(255,255,255,0.5)', letterSpacing: '0.05em',
        }}>
          文档列表
        </div>
        <Menu
          mode="inline"
          selectedKeys={[activeFile]}
          onClick={({ key }) => setActiveFile(key)}
          style={{ background: 'transparent', borderRight: 'none' }}
          items={docs.map(d => ({
            key: d.filename,
            label: <span style={{ fontSize: 13 }}>{d.name}</span>,
            icon: <FileTextOutlined />,
          }))}
        />
      </div>

      {/* 右侧阅读/编辑区 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* 工具栏 */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '8px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)',
          background: 'rgba(255,255,255,0.02)', flexShrink: 0,
        }}>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
            {activeFile || '请选择文档'}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            {!editing && content && (
              <Button size="small" icon={<FullscreenOutlined />} onClick={() => setFullscreen(true)}>全屏</Button>
            )}
            {editing ? (
              <>
                <Button size="small" icon={<EyeOutlined />} onClick={() => {
                  if (textareaRef.current) scrollTopRef.current = textareaRef.current.scrollTop;
                  setEditing(false);
                  requestAnimationFrame(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollTopRef.current; });
                }}>预览</Button>
                <Button size="small" type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>保存</Button>
              </>
            ) : (
              <Button size="small" icon={<EditOutlined />} onClick={() => {
                if (scrollRef.current) scrollTopRef.current = scrollRef.current.scrollTop;
                setEditContent(content);
                setEditing(true);
                requestAnimationFrame(() => { if (textareaRef.current) textareaRef.current.scrollTop = scrollTopRef.current; });
              }}>编辑</Button>
            )}
          </div>
        </div>

        {/* 内容区 */}
        <div ref={scrollRef} style={{ flex: 1, overflow: isHtml && !editing ? 'hidden' : 'auto', padding: editing ? 0 : isHtml ? 0 : '24px 40px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 60 }}><Spin /></div>
          ) : editing ? (
            <textarea
              ref={textareaRef}
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              style={{
                width: '100%', height: '100%', resize: 'none', border: 'none', outline: 'none',
                padding: '24px 40px', fontSize: 14, lineHeight: 1.8,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                background: 'rgba(0,0,0,0.2)', color: 'rgba(255,255,255,0.85)',
                tabSize: 2,
              }}
              spellCheck={false}
            />
          ) : renderContent()}
        </div>
      </div>

      {/* 全屏浮动框 */}
      <Modal
        title={null}
        open={fullscreen}
        onCancel={() => setFullscreen(false)}
        footer={null}
        closable={false}
        width="100vw"
        destroyOnClose
        maskClosable
        styles={{
          body: { height: '100vh', padding: 0, overflow: 'hidden', position: 'relative' },
          content: { padding: 0, borderRadius: 0 },
          mask: { background: 'rgba(0,0,0,0.85)' },
        }}
        style={{ top: 0, maxWidth: '100vw', margin: 0, padding: 0 }}
      >
        <Button
          type="text"
          icon={<CloseOutlined />}
          onClick={() => setFullscreen(false)}
          style={{
            position: 'absolute', top: 8, right: 12, zIndex: 10,
            color: 'rgba(255,255,255,0.5)', fontSize: 16,
            background: 'rgba(0,0,0,0.3)', borderRadius: 6,
            width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        />
        <div style={{ width: '100%', height: '100%', overflow: isHtml ? 'hidden' : 'auto' }}>
          {renderContent(true)}
        </div>
      </Modal>

      <style>{`
        .doc-reader {
          max-width: 860px;
          line-height: 1.8;
          color: rgba(255,255,255,0.85);
        }
        .doc-reader h1 {
          font-size: 28px; font-weight: 700; margin: 0 0 24px;
          padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.08);
          color: #f1f5f9;
        }
        .doc-reader h2 {
          font-size: 22px; font-weight: 700; margin: 32px 0 16px;
          padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.06);
          color: #e2e8f0;
        }
        .doc-reader h3 {
          font-size: 17px; font-weight: 600; margin: 24px 0 12px;
          color: #cbd5e1;
        }
        .doc-reader h4 {
          font-size: 15px; font-weight: 600; margin: 20px 0 8px;
          color: #94a3b8;
        }
        .doc-reader p { margin: 8px 0; font-size: 14px; }
        .doc-reader ul, .doc-reader ol { padding-left: 24px; margin: 8px 0; }
        .doc-reader li { margin: 4px 0; font-size: 14px; }
        .doc-reader table {
          width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px;
        }
        .doc-reader th {
          background: rgba(255,255,255,0.05); padding: 8px 12px; text-align: left;
          border: 1px solid rgba(255,255,255,0.08); font-weight: 600; color: #e2e8f0;
        }
        .doc-reader td {
          padding: 8px 12px; border: 1px solid rgba(255,255,255,0.06); color: rgba(255,255,255,0.75);
        }
        .doc-reader tr:hover td { background: rgba(255,255,255,0.02); }
        .doc-reader code {
          background: rgba(255,255,255,0.06); padding: 2px 6px; border-radius: 4px;
          font-size: 13px; color: #22d3ee; font-family: 'JetBrains Mono', monospace;
        }
        .doc-reader pre {
          background: rgba(0,0,0,0.3); padding: 16px; border-radius: 8px;
          overflow-x: auto; margin: 12px 0;
          border: 1px solid rgba(255,255,255,0.06);
        }
        .doc-reader pre code {
          background: none; padding: 0; color: rgba(255,255,255,0.8);
        }
        .doc-reader blockquote {
          border-left: 3px solid rgba(34,211,238,0.4); padding: 8px 16px;
          margin: 12px 0; background: rgba(34,211,238,0.04); border-radius: 0 6px 6px 0;
          color: rgba(255,255,255,0.6);
        }
        .doc-reader hr {
          border: none; border-top: 1px solid rgba(255,255,255,0.06); margin: 24px 0;
        }
      `}</style>
    </div>
  );
};

export default ProductDocs;
