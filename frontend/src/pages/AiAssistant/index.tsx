import React, { useState, useEffect, useRef } from 'react';
import { Button, Input, List, Empty, Popconfirm, message } from 'antd';
import { PlusOutlined, DeleteOutlined, SendOutlined, RobotOutlined, UserOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import MessageContent from '@/components/MessageContent';
import { useAssistantStore, ChatMessage, ChatSession } from '@/stores/assistantStore';

/** 思考中动画（亮色版）— 旋转光球 + 流光文字 + 音频柱 */
const ThinkingIndicatorLight: React.FC = () => (
  <div className="thinking-container-light">
    <div className="thinking-orb-light">
      <div className="thinking-orb-light-pulse" />
      <div className="thinking-orb-light-ring" />
      <div className="thinking-orb-light-ring2" />
      <div className="thinking-orb-light-core" />
    </div>
    <span className="thinking-text-light">正在思考</span>
    <div className="thinking-bar-group-light">
      <div className="thinking-bar-light" />
      <div className="thinking-bar-light" />
      <div className="thinking-bar-light" />
      <div className="thinking-bar-light" />
      <div className="thinking-bar-light" />
    </div>
    <style>{`
      @keyframes orbit-light { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      @keyframes pulse-light { 0% { transform: scale(0.8); opacity: 0.4; } 50% { transform: scale(1.2); opacity: 0.08; } 100% { transform: scale(0.8); opacity: 0.4; } }
      @keyframes shimmer-light { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
      @keyframes fade-up-light { 0% { opacity: 0; transform: translateY(6px); } 100% { opacity: 1; transform: translateY(0); } }
      @keyframes bar-light { 0%, 100% { height: 4px; opacity: 0.3; } 50% { height: 16px; opacity: 1; } }
      .thinking-container-light { display: flex; align-items: center; gap: 12px; padding: 8px 4px; animation: fade-up-light 0.3s ease-out; }
      .thinking-orb-light { position: relative; width: 28px; height: 28px; flex-shrink: 0; }
      .thinking-orb-light-core {
        position: absolute; top: 50%; left: 50%; width: 8px; height: 8px; margin: -4px 0 0 -4px; border-radius: 50%;
        background: linear-gradient(135deg, #1677ff, #722ed1);
        box-shadow: 0 0 10px rgba(22,119,255,0.5), 0 0 20px rgba(114,46,209,0.25);
      }
      .thinking-orb-light-ring {
        position: absolute; inset: 0; border-radius: 50%;
        border: 1.5px solid transparent; border-top-color: #1677ff; border-right-color: #722ed1;
        animation: orbit-light 1.5s linear infinite;
      }
      .thinking-orb-light-ring2 {
        position: absolute; inset: 3px; border-radius: 50%;
        border: 1px solid transparent; border-bottom-color: rgba(22,119,255,0.35); border-left-color: rgba(114,46,209,0.35);
        animation: orbit-light 2.2s linear infinite reverse;
      }
      .thinking-orb-light-pulse {
        position: absolute; inset: -4px; border-radius: 50%;
        background: radial-gradient(circle, rgba(22,119,255,0.12) 0%, transparent 70%);
        animation: pulse-light 2s ease-in-out infinite;
      }
      .thinking-text-light {
        font-size: 13px; font-weight: 500; letter-spacing: 0.5px;
        background: linear-gradient(90deg, #bbb 0%, #1677ff 25%, #722ed1 50%, #1677ff 75%, #bbb 100%);
        background-size: 200% auto;
        -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
        animation: shimmer-light 2.5s linear infinite;
      }
      .thinking-bar-group-light { display: flex; align-items: flex-end; gap: 3px; height: 16px; }
      .thinking-bar-light {
        width: 3px; border-radius: 2px;
        background: linear-gradient(to top, #1677ff, #722ed1);
        animation: bar-light 1.2s ease-in-out infinite;
      }
      .thinking-bar-light:nth-child(1) { animation-delay: 0s; }
      .thinking-bar-light:nth-child(2) { animation-delay: 0.15s; }
      .thinking-bar-light:nth-child(3) { animation-delay: 0.3s; }
      .thinking-bar-light:nth-child(4) { animation-delay: 0.45s; }
      .thinking-bar-light:nth-child(5) { animation-delay: 0.6s; }
    `}</style>
  </div>
);

const AiAssistant: React.FC = () => {
  const {
    sessionId, sessions, messages, isStreaming,
    loadSessions, createSession, switchSession, deleteSession, sendMessage, confirmOperation,
  } = useAssistantStore();

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadSessions(); }, []);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput('');
    await sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 120px)', background: 'rgba(255,255,255,0.03)', borderRadius: 8, overflow: 'hidden', border: '1px solid #f0f0f0' }}>
      {/* 左侧会话列表 */}
      <div style={{ width: 280, borderRight: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column', background: '#fafafa' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0' }}>
          <Button type="primary" icon={<PlusOutlined />} block onClick={() => createSession()}>新建对话</Button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
          {sessions.length === 0 ? (
            <Empty description="暂无对话" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ marginTop: 40 }} />
          ) : (
            <List size="small" dataSource={sessions} renderItem={(s: ChatSession) => (
              <div key={s.sessionId} onClick={() => switchSession(s.sessionId)}
                style={{
                  padding: '10px 12px', marginBottom: 4, borderRadius: 6, cursor: 'pointer',
                  background: sessionId === s.sessionId ? '#e6f4ff' : 'transparent',
                  border: sessionId === s.sessionId ? '1px solid #91caff' : '1px solid transparent',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s',
                }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title || '新对话'}</div>
                  <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{s.messageCount} 条消息</div>
                </div>
                <Popconfirm title="删除此对话？" onConfirm={(e) => { e?.stopPropagation(); deleteSession(s.sessionId); }}
                            onCancel={(e) => e?.stopPropagation()}>
                  <Button type="text" size="small" danger icon={<DeleteOutlined />}
                          onClick={(e) => e.stopPropagation()} style={{ opacity: 0.5 }} />
                </Popconfirm>
              </div>
            )} />
          )}
        </div>
      </div>

      {/* 右侧对话区 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
          {!sessionId && messages.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#999' }}>
              <RobotOutlined style={{ fontSize: 48, marginBottom: 16, color: '#bbb' }} />
              <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 8, color: '#666' }}>人才打标 AI 助手</div>
              <div style={{ fontSize: 13, color: '#999', textAlign: 'center', lineHeight: 1.8 }}>
                我可以帮你查询标签、规则、任务数据<br />
                也可以帮你执行规则发布、任务运行等操作<br />
                试试输入"列出所有已发布的规则"
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg: ChatMessage) => (
                <MessageBubble key={msg.id} message={msg} onConfirm={confirmOperation} />
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        <div style={{ padding: '12px 24px 16px', borderTop: '1px solid #f0f0f0', background: '#fafafa' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <Input.TextArea
              value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
              placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
              autoSize={{ minRows: 1, maxRows: 4 }} disabled={isStreaming}
              style={{ borderRadius: 8 }}
            />
            <Button type="primary" icon={<SendOutlined />} onClick={handleSend}
                    disabled={!input.trim() || isStreaming} loading={isStreaming}
                    style={{ height: 'auto', borderRadius: 8, minWidth: 44 }} />
          </div>
        </div>
      </div>
    </div>
  );
};

const MessageBubble: React.FC<{ message: ChatMessage; onConfirm: (opId: string, approved: boolean) => Promise<void> }> = ({ message: msg, onConfirm }) => {
  const isUser = msg.role === 'user';
  const hasEmbeddedBlock = !isUser && /```(?:embedded|widget)\b/i.test(msg.content || '');
  const bubbleMaxWidth = hasEmbeddedBlock ? '92%' : '70%';
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 16, gap: 8 }}>
      {!isUser && (
        <div style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, #0ea5e9, #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <RobotOutlined style={{ color: '#fff', fontSize: 16 }} />
        </div>
      )}
      <div style={{
        maxWidth: bubbleMaxWidth, width: hasEmbeddedBlock ? bubbleMaxWidth : undefined,
        minWidth: 0, padding: '10px 14px', borderRadius: 12,
        background: isUser ? '#1677ff' : '#f5f5f5',
        color: isUser ? '#fff' : '#333',
        fontSize: 14, lineHeight: 1.6, wordBreak: 'break-word',
      }} className={!isUser ? 'markdown-body' : ''}>
        {isUser ? msg.content : (
          msg.isThinking ? <ThinkingIndicatorLight /> : (
            <MessageContent content={msg.content} isStreaming={false} isDark={false} />
          )
        )}
        {msg.pendingOperation && msg.pendingOperation.status === 'pending' && (
          <div style={{ marginTop: 12, padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid #e8e8e8', color: '#333' }}>
            <div style={{ fontWeight: 500, marginBottom: 8 }}>待确认操作：{msg.pendingOperation.targetName}</div>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>{msg.pendingOperation.message}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button type="primary" size="small" icon={<CheckCircleOutlined />}
                      onClick={() => onConfirm(msg.pendingOperation!.operationId, true)}>确认执行</Button>
              <Button size="small" icon={<CloseCircleOutlined />}
                      onClick={() => onConfirm(msg.pendingOperation!.operationId, false)}>取消</Button>
            </div>
          </div>
        )}
        {msg.pendingOperation && msg.pendingOperation.status === 'confirmed' && (
          <div style={{ marginTop: 8, fontSize: 12, color: '#52c41a' }}>已执行</div>
        )}
        {msg.pendingOperation && msg.pendingOperation.status === 'rejected' && (
          <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>已取消</div>
        )}
      </div>
      {isUser && (
        <div style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
          background: '#1677ff', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <UserOutlined style={{ color: '#fff', fontSize: 16 }} />
        </div>
      )}
    </div>
  );
};

export default AiAssistant;
