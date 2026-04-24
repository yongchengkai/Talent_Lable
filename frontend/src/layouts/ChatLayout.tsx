import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, List, Empty, Popconfirm, message } from 'antd';
import {
  PlusOutlined, DeleteOutlined, SendOutlined, RobotOutlined, UserOutlined,
  CheckCircleOutlined, CloseCircleOutlined, AppstoreOutlined,
} from '@ant-design/icons';
import MessageContent from '@/components/MessageContent';
import NotificationBell from '@/components/NotificationBell';
import { useAssistantStore, ChatMessage, ChatSession } from '@/stores/assistantStore';
import { useNotificationStore } from '@/stores/notificationStore';

export default function ChatLayout() {
  const navigate = useNavigate();
  const {
    sessionId, sessions, messages, isStreaming,
    loadSessions, createSession, switchSession, deleteSession, sendMessage, confirmOperation,
  } = useAssistantStore();
  const { startPolling, stopPolling } = useNotificationStore();

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadSessions(); startPolling(); return () => stopPolling(); }, []);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput('');
    await sendMessage(text);
  };

  const handleNotificationChat = async (message: string, notificationId: number) => {
    useAssistantStore.getState().setPageContext({
      currentPage: '/notifications',
      filters: { notificationId: String(notificationId) },
    });
    if (!sessionId) await createSession();
    await sendMessage(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0a0a18' }}>
      {/* 顶部栏 */}
      <div style={{
        height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', background: 'rgba(10,10,24,0.95)', borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: 'linear-gradient(135deg, #0ea5e9, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(14,165,233,0.3)',
          }}>
            <RobotOutlined style={{ color: '#fff', fontSize: 16 }} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc', lineHeight: 1.2 }}>人才打标 AI 助手</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em' }}>TALENT LABEL AI</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <NotificationBell onOpenChat={handleNotificationChat} />
          <Button
            type="primary" ghost size="small"
            icon={<AppstoreOutlined />}
            onClick={() => navigate('/app')}
            style={{ borderColor: 'rgba(14,165,233,0.5)', color: '#0ea5e9' }}
          >
            进入系统
          </Button>
        </div>
      </div>

      {/* 主体 */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* 左侧会话列表 */}
        <div style={{
          width: 280, borderRight: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.02)',
        }}>
          <div style={{ padding: 16, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <Button block onClick={() => createSession()}
              style={{ background: 'linear-gradient(135deg, #0ea5e9, #8b5cf6)', border: 'none', color: '#fff', fontWeight: 500 }}>
              <PlusOutlined /> 新建对话
            </Button>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
            {sessions.length === 0 ? (
              <Empty description={<span style={{ color: 'rgba(255,255,255,0.3)' }}>暂无对话</span>}
                     image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ marginTop: 60 }} />
            ) : (
              sessions.map((s: ChatSession) => (
                <div key={s.sessionId} onClick={() => switchSession(s.sessionId)}
                  style={{
                    padding: '10px 12px', marginBottom: 4, borderRadius: 8, cursor: 'pointer',
                    background: sessionId === s.sessionId ? 'rgba(14,165,233,0.15)' : 'transparent',
                    border: sessionId === s.sessionId ? '1px solid rgba(14,165,233,0.3)' : '1px solid transparent',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    transition: 'all 0.2s',
                  }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.title || '新对话'}
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>{s.messageCount} 条消息</div>
                  </div>
                  <Popconfirm title="删除此对话？" onConfirm={(e) => { e?.stopPropagation(); deleteSession(s.sessionId); }}
                              onCancel={(e) => e?.stopPropagation()}>
                    <Button type="text" size="small" icon={<DeleteOutlined />}
                            onClick={(e) => e.stopPropagation()}
                            style={{ color: 'rgba(255,255,255,0.2)' }} />
                  </Popconfirm>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 右侧对话区 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#111127' }}>
          {/* 消息区 */}
          <div style={{ flex: 1, overflow: 'auto', padding: '24px 32px' }}>
            {!sessionId && messages.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <div style={{
                  width: 72, height: 72, borderRadius: 20,
                  background: 'linear-gradient(135deg, #0ea5e9, #8b5cf6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 24, boxShadow: '0 0 40px rgba(14,165,233,0.2)',
                }}>
                  <RobotOutlined style={{ color: '#fff', fontSize: 32 }} />
                </div>
                <div style={{ fontSize: 22, fontWeight: 600, color: '#e2e8f0', marginBottom: 8 }}>你好，我是人才打标 AI 助手</div>
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 1.8 }}>
                  我可以帮你查询标签、规则、任务数据<br />
                  也可以帮你执行规则发布、任务运行等操作<br />
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {['列出所有已发布的规则', '核心骨干标签覆盖了多少人', '帮我规划一套标签体系'].map(text => (
                    <Button key={text} size="small" onClick={() => { createSession().then(() => sendMessage(text)); }}
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', borderRadius: 20 }}>
                      {text}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg: ChatMessage) => (
                  <MessageBubble key={msg.id} message={msg} onConfirm={confirmOperation} onNavigate={(page) => navigate(page)} />
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* 输入区 */}
          <div style={{ padding: '12px 32px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{
              display: 'flex', gap: 8, background: 'rgba(255,255,255,0.05)',
              borderRadius: 12, padding: '8px 12px', border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <Input.TextArea
                value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
                placeholder="输入消息... (Enter 发送)"
                autoSize={{ minRows: 1, maxRows: 4 }} disabled={isStreaming}
                style={{ background: 'transparent', border: 'none', color: '#e2e8f0', resize: 'none', boxShadow: 'none' }}
              />
              <Button type="primary" icon={<SendOutlined />} onClick={handleSend}
                      disabled={!input.trim() || isStreaming} loading={isStreaming}
                      style={{ height: 'auto', borderRadius: 8, minWidth: 44, background: 'linear-gradient(135deg, #0ea5e9, #8b5cf6)', border: 'none' }} />
            </div>
          </div>
        </div>
      </div>

      {/* 思考动画 CSS */}
      <style>{`
        @keyframes orbit {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.8); opacity: 0.5; }
          50% { transform: scale(1.2); opacity: 0.1; }
          100% { transform: scale(0.8); opacity: 0.5; }
        }
        @keyframes shimmer-text {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes fade-in-up {
          0% { opacity: 0; transform: translateY(6px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .thinking-container {
          display: flex; align-items: center; gap: 14px; padding: 8px 4px;
          animation: fade-in-up 0.3s ease-out;
        }
        .thinking-orb {
          position: relative; width: 32px; height: 32px; flex-shrink: 0;
        }
        .thinking-orb-core {
          position: absolute; top: 50%; left: 50%; width: 10px; height: 10px;
          margin: -5px 0 0 -5px; border-radius: 50%;
          background: linear-gradient(135deg, #0ea5e9, #8b5cf6);
          box-shadow: 0 0 12px rgba(14,165,233,0.6), 0 0 24px rgba(139,92,246,0.3);
        }
        .thinking-orb-ring {
          position: absolute; inset: 0; border-radius: 50%;
          border: 1.5px solid transparent;
          border-top-color: #0ea5e9; border-right-color: #8b5cf6;
          animation: orbit 1.5s linear infinite;
        }
        .thinking-orb-ring2 {
          position: absolute; inset: 3px; border-radius: 50%;
          border: 1px solid transparent;
          border-bottom-color: rgba(14,165,233,0.4); border-left-color: rgba(139,92,246,0.4);
          animation: orbit 2.2s linear infinite reverse;
        }
        .thinking-orb-pulse {
          position: absolute; inset: -4px; border-radius: 50%;
          background: radial-gradient(circle, rgba(14,165,233,0.15) 0%, transparent 70%);
          animation: pulse-ring 2s ease-in-out infinite;
        }
        .thinking-text {
          font-size: 13px; font-weight: 500; letter-spacing: 0.5px;
          background: linear-gradient(90deg, rgba(255,255,255,0.3) 0%, #0ea5e9 25%, #8b5cf6 50%, #0ea5e9 75%, rgba(255,255,255,0.3) 100%);
          background-size: 200% auto;
          -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer-text 2.5s linear infinite;
        }
        .thinking-bar-group {
          display: flex; align-items: flex-end; gap: 3px; height: 16px;
        }
        .thinking-bar {
          width: 3px; border-radius: 2px;
          background: linear-gradient(to top, #0ea5e9, #8b5cf6);
          animation: bar-dance 1.2s ease-in-out infinite;
        }
        @keyframes bar-dance {
          0%, 100% { height: 4px; opacity: 0.4; }
          50% { height: 16px; opacity: 1; }
        }
        .thinking-bar:nth-child(1) { animation-delay: 0s; }
        .thinking-bar:nth-child(2) { animation-delay: 0.15s; }
        .thinking-bar:nth-child(3) { animation-delay: 0.3s; }
        .thinking-bar:nth-child(4) { animation-delay: 0.45s; }
        .thinking-bar:nth-child(5) { animation-delay: 0.6s; }
      `}</style>
    </div>
  );
}

/** 思考中动画组件 — 旋转光球 + 流光文字 + 音频柱 */
const ThinkingIndicator: React.FC = () => (
  <div className="thinking-container">
    <div className="thinking-orb">
      <div className="thinking-orb-pulse" />
      <div className="thinking-orb-ring" />
      <div className="thinking-orb-ring2" />
      <div className="thinking-orb-core" />
    </div>
    <span className="thinking-text">正在思考</span>
    <div className="thinking-bar-group">
      <div className="thinking-bar" />
      <div className="thinking-bar" />
      <div className="thinking-bar" />
      <div className="thinking-bar" />
      <div className="thinking-bar" />
    </div>
  </div>
);

const MessageBubble: React.FC<{ message: ChatMessage; onConfirm: (opId: string, approved: boolean) => Promise<void>; onNavigate?: (page: string) => void }> = ({ message: msg, onConfirm, onNavigate }) => {
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
        background: isUser ? 'linear-gradient(135deg, #0ea5e9, #8b5cf6)' : 'rgba(255,255,255,0.06)',
        color: isUser ? '#fff' : '#e2e8f0',
        fontSize: 14, lineHeight: 1.6, wordBreak: 'break-word',
      }} className={!isUser ? 'markdown-body markdown-body-dark' : ''}>
        {isUser ? msg.content : (
          msg.isThinking ? <ThinkingIndicator /> : (
            <MessageContent content={msg.content} isStreaming={false} isDark={true} onNavigate={onNavigate} />
          )
        )}
        {msg.pendingOperation && msg.pendingOperation.status === 'pending' && (
          <div style={{ marginTop: 12, padding: 12, background: 'rgba(0,0,0,0.3)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontWeight: 500, marginBottom: 8, color: '#e2e8f0' }}>待确认：{msg.pendingOperation.targetName}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 12 }}>{msg.pendingOperation.message}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button type="primary" size="small" icon={<CheckCircleOutlined />}
                      onClick={() => onConfirm(msg.pendingOperation!.operationId, true)}
                      style={{ background: '#10b981', border: 'none' }}>确认执行</Button>
              <Button size="small" icon={<CloseCircleOutlined />}
                      onClick={() => onConfirm(msg.pendingOperation!.operationId, false)}
                      style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#e2e8f0' }}>取消</Button>
            </div>
          </div>
        )}
        {msg.pendingOperation && msg.pendingOperation.status === 'confirmed' && (
          <div style={{ marginTop: 8, fontSize: 12, color: '#10b981' }}>已执行</div>
        )}
        {msg.pendingOperation && msg.pendingOperation.status === 'rejected' && (
          <div style={{ marginTop: 8, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>已取消</div>
        )}
      </div>
      {isUser && (
        <div style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <UserOutlined style={{ color: '#fff', fontSize: 16 }} />
        </div>
      )}
    </div>
  );
};
