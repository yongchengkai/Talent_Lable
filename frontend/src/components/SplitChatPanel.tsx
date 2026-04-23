import React, { useState, useEffect, useRef } from 'react';
import { Button, Input } from 'antd';
import { SendOutlined, RobotOutlined, UserOutlined, CloseOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import MessageContent from '@/components/MessageContent';
import { useAssistantStore, ChatMessage } from '@/stores/assistantStore';

/** 思考中动画（紧凑版）— 旋转光球 + 流光文字 + 音频柱 */
const ThinkingIndicatorMini: React.FC = () => (
  <div className="thinking-container-mini">
    <div className="thinking-orb-mini">
      <div className="thinking-orb-mini-pulse" />
      <div className="thinking-orb-mini-ring" />
      <div className="thinking-orb-mini-core" />
    </div>
    <span className="thinking-text-mini">思考中</span>
    <div className="thinking-bar-group-mini">
      <div className="thinking-bar-mini" />
      <div className="thinking-bar-mini" />
      <div className="thinking-bar-mini" />
      <div className="thinking-bar-mini" />
    </div>
    <style>{`
      @keyframes orbit-mini { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      @keyframes pulse-mini { 0% { transform: scale(0.8); opacity: 0.4; } 50% { transform: scale(1.2); opacity: 0.08; } 100% { transform: scale(0.8); opacity: 0.4; } }
      @keyframes shimmer-mini { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
      @keyframes fade-up-mini { 0% { opacity: 0; transform: translateY(4px); } 100% { opacity: 1; transform: translateY(0); } }
      @keyframes bar-mini { 0%, 100% { height: 3px; opacity: 0.3; } 50% { height: 12px; opacity: 1; } }
      .thinking-container-mini { display: flex; align-items: center; gap: 10px; padding: 4px 0; animation: fade-up-mini 0.3s ease-out; }
      .thinking-orb-mini { position: relative; width: 20px; height: 20px; flex-shrink: 0; }
      .thinking-orb-mini-core {
        position: absolute; top: 50%; left: 50%; width: 6px; height: 6px; margin: -3px 0 0 -3px; border-radius: 50%;
        background: linear-gradient(135deg, #1677ff, #722ed1);
        box-shadow: 0 0 8px rgba(22,119,255,0.5), 0 0 16px rgba(114,46,209,0.2);
      }
      .thinking-orb-mini-ring {
        position: absolute; inset: 0; border-radius: 50%;
        border: 1.5px solid transparent; border-top-color: #1677ff; border-right-color: #722ed1;
        animation: orbit-mini 1.5s linear infinite;
      }
      .thinking-orb-mini-pulse {
        position: absolute; inset: -3px; border-radius: 50%;
        background: radial-gradient(circle, rgba(22,119,255,0.1) 0%, transparent 70%);
        animation: pulse-mini 2s ease-in-out infinite;
      }
      .thinking-text-mini {
        font-size: 12px; font-weight: 500; letter-spacing: 0.5px;
        background: linear-gradient(90deg, #bbb 0%, #1677ff 25%, #722ed1 50%, #1677ff 75%, #bbb 100%);
        background-size: 200% auto;
        -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
        animation: shimmer-mini 2.5s linear infinite;
      }
      .thinking-bar-group-mini { display: flex; align-items: flex-end; gap: 2px; height: 12px; }
      .thinking-bar-mini {
        width: 2px; border-radius: 1px;
        background: linear-gradient(to top, #1677ff, #722ed1);
        animation: bar-mini 1.2s ease-in-out infinite;
      }
      .thinking-bar-mini:nth-child(1) { animation-delay: 0s; }
      .thinking-bar-mini:nth-child(2) { animation-delay: 0.15s; }
      .thinking-bar-mini:nth-child(3) { animation-delay: 0.3s; }
      .thinking-bar-mini:nth-child(4) { animation-delay: 0.45s; }
    `}</style>
  </div>
);

const SplitChatPanel: React.FC<{ onClose: () => void; onNavigate?: (page: string) => void }> = ({ onClose, onNavigate }) => {
  const {
    sessionId, messages, isStreaming,
    createSession, sendMessage, confirmOperation, loadSessions, switchSession,
  } = useAssistantStore();

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      await loadSessions();
      const { sessions: loaded, sessionId: current } = useAssistantStore.getState();
      if (!current && loaded.length > 0) {
        await switchSession(loaded[0].sessionId);
      } else if (!current) {
        await createSession();
      }
    };
    init();
  }, []);

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
    <div style={{
      width: 400, height: '100%', display: 'flex', flexDirection: 'column',
      borderLeft: '1px solid rgba(0,0,0,0.06)', background: '#fafafa',
    }}>
      {/* 头部 */}
      <div style={{
        height: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', borderBottom: '1px solid #f0f0f0', background: '#fff',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 24, height: 24, borderRadius: 6,
            background: 'linear-gradient(135deg, #0ea5e9, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <RobotOutlined style={{ color: '#fff', fontSize: 12 }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>AI 助手</span>
        </div>
        <Button type="text" size="small" icon={<CloseOutlined />} onClick={onClose} />
      </div>

      {/* 消息区 */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#999', marginTop: 40, fontSize: 13 }}>
            <RobotOutlined style={{ fontSize: 28, color: '#ccc', display: 'block', marginBottom: 8 }} />
            输入消息开始对话
          </div>
        ) : (
          <>
            {messages.map((msg: ChatMessage) => (
              <MiniMessage key={msg.id} message={msg} onConfirm={confirmOperation} onNavigate={onNavigate} />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* 输入区 */}
      <div style={{ padding: '8px 12px 12px', borderTop: '1px solid #f0f0f0', background: '#fff' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <Input.TextArea
            value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
            placeholder="输入消息..."
            autoSize={{ minRows: 1, maxRows: 3 }} disabled={isStreaming}
            style={{ borderRadius: 8, fontSize: 13 }}
          />
          <Button type="primary" icon={<SendOutlined />} onClick={handleSend}
                  disabled={!input.trim() || isStreaming} loading={isStreaming}
                  style={{ height: 'auto', borderRadius: 8, minWidth: 36 }} />
        </div>
      </div>
    </div>
  );
};

const MiniMessage: React.FC<{ message: ChatMessage; onConfirm: (opId: string, approved: boolean) => Promise<void>; onNavigate?: (page: string) => void }> = ({ message: msg, onConfirm, onNavigate }) => {
  const isUser = msg.role === 'user';
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 10, gap: 6 }}>
      {!isUser && (
        <div style={{
          width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, #0ea5e9, #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <RobotOutlined style={{ color: '#fff', fontSize: 11 }} />
        </div>
      )}
      <div style={{
        maxWidth: '80%', padding: '8px 12px', borderRadius: 10,
        background: isUser ? '#1677ff' : '#fff',
        color: isUser ? '#fff' : '#333',
        fontSize: 13, lineHeight: 1.5, wordBreak: 'break-word',
        boxShadow: isUser ? 'none' : '0 1px 2px rgba(0,0,0,0.06)',
      }} className={!isUser ? 'markdown-body' : ''}>
        {isUser ? msg.content : (
          msg.isThinking ? <ThinkingIndicatorMini /> : (
            <MessageContent content={msg.content} isStreaming={false} isDark={false} onNavigate={onNavigate} />
          )
        )}
        {msg.pendingOperation && msg.pendingOperation.status === 'pending' && (
          <div style={{ marginTop: 8, padding: 8, background: '#f5f5f5', borderRadius: 6, border: '1px solid #e8e8e8' }}>
            <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 6 }}>{msg.pendingOperation.targetName}</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <Button type="primary" size="small" icon={<CheckCircleOutlined />}
                      onClick={() => onConfirm(msg.pendingOperation!.operationId, true)} style={{ fontSize: 12 }}>确认</Button>
              <Button size="small" icon={<CloseCircleOutlined />}
                      onClick={() => onConfirm(msg.pendingOperation!.operationId, false)} style={{ fontSize: 12 }}>取消</Button>
            </div>
          </div>
        )}
        {msg.pendingOperation && msg.pendingOperation.status === 'confirmed' && (
          <div style={{ marginTop: 4, fontSize: 11, color: '#52c41a' }}>已执行</div>
        )}
        {msg.pendingOperation && msg.pendingOperation.status === 'rejected' && (
          <div style={{ marginTop: 4, fontSize: 11, color: '#999' }}>已取消</div>
        )}
      </div>
    </div>
  );
};

export default SplitChatPanel;
