import { create } from 'zustand';
import { assistantApi } from '@/services/api';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  pendingOperation?: PendingOperation;
  isStreaming?: boolean;
  isThinking?: boolean;
}

export interface PendingOperation {
  operationId: string;
  type: string;
  targetName: string;
  skillCode: string;
  params: Record<string, any>;
  impact?: Record<string, any>;
  status: 'pending' | 'confirmed' | 'rejected' | 'failed';
  message: string;
}

export interface ChatSession {
  id: number;
  sessionId: string;
  title: string;
  messageCount: number;
  lastMessageAt: string;
  createdAt: string;
}

interface AssistantState {
  sessionId: string | null;
  sessions: ChatSession[];
  messages: ChatMessage[];
  isStreaming: boolean;
  pageContext: { currentPage: string; selectedIds: number[]; filters: Record<string, string> };

  loadSessions: () => Promise<void>;
  createSession: () => Promise<string>;
  switchSession: (sessionId: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  setPageContext: (ctx: Partial<AssistantState['pageContext']>) => void;
  confirmOperation: (operationId: string, approved: boolean) => Promise<void>;
}

export const useAssistantStore = create<AssistantState>((set, get) => ({
  sessionId: null,
  sessions: [],
  messages: [],
  isStreaming: false,
  pageContext: { currentPage: '/', selectedIds: [], filters: {} },

  loadSessions: async () => {
    try {
      const res: any = await assistantApi.listSessions();
      set({ sessions: res.data || [] });
    } catch { /* ignore */ }
  },

  createSession: async () => {
    const res: any = await assistantApi.createSession();
    const session = res.data;
    set(s => ({
      sessionId: session.sessionId,
      sessions: [session, ...s.sessions],
      messages: [],
    }));
    return session.sessionId;
  },

  switchSession: async (sessionId: string) => {
    set({ sessionId, messages: [], isStreaming: false });
    try {
      const res: any = await assistantApi.getMessages(sessionId);
      const msgs: ChatMessage[] = (res.data || []).map((m: any) => ({
        id: String(m.id),
        role: m.role,
        content: m.content,
        timestamp: new Date(m.createdAt).getTime(),
        pendingOperation: m.pendingOp ? JSON.parse(m.pendingOp) : undefined,
      }));
      set({ messages: msgs });
    } catch { /* ignore */ }
  },

  deleteSession: async (sessionId: string) => {
    await assistantApi.deleteSession(sessionId);
    set(s => ({
      sessions: s.sessions.filter(ss => ss.sessionId !== sessionId),
      sessionId: s.sessionId === sessionId ? null : s.sessionId,
      messages: s.sessionId === sessionId ? [] : s.messages,
    }));
  },

  sendMessage: async (content: string) => {
    let { sessionId } = get();
    if (!sessionId) {
      sessionId = await get().createSession();
    }

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
      isThinking: true,
    };

    set(s => ({
      messages: [...s.messages, userMsg, assistantMsg],
      isStreaming: true,
    }));

    try {
      const response = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          message: content,
          context: get().pageContext,
        }),
      });

      if (!response.ok) {
        let errorMsg = `请求失败 (${response.status})`;
        try {
          const errBody = await response.json();
          errorMsg = errBody.message || errorMsg;
        } catch {}
        throw new Error(errorMsg);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let currentEvent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event:')) {
            currentEvent = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            const data = line.slice(5);

            if (currentEvent === 'done' || data === '[DONE]') {
              set(s => ({
                isStreaming: false,
                messages: s.messages.map(m =>
                  m.id === assistantMsg.id ? { ...m, isStreaming: false, isThinking: false } : m
                ),
              }));
            } else if (currentEvent === 'error') {
              set(s => ({
                isStreaming: false,
                messages: s.messages.map(m =>
                  m.id === assistantMsg.id
                    ? { ...m, content: data || '请求处理失败', isStreaming: false, isThinking: false }
                    : m
                ),
              }));
            } else if (currentEvent === 'thinking') {
              // 进入思考状态，显示思考动画
              set(s => ({
                messages: s.messages.map(m =>
                  m.id === assistantMsg.id ? { ...m, isThinking: true, content: '' } : m
                ),
              }));
            } else if (currentEvent === 'content') {
              // 收到完整内容（JSON 编码），解码后一次性设置
              let decoded = data;
              try { decoded = JSON.parse(data); } catch {}
              set(s => ({
                messages: s.messages.map(m =>
                  m.id === assistantMsg.id
                    ? { ...m, content: decoded, isThinking: false, isStreaming: false }
                    : m
                ),
              }));
            } else if (currentEvent === 'token') {
              // 兼容旧的逐字模式
              set(s => ({
                messages: s.messages.map(m =>
                  m.id === assistantMsg.id
                    ? { ...m, content: m.content + data, isThinking: false }
                    : m
                ),
              }));
            }
          }
        }
      }

      // 确保流结束
      set(s => ({
        isStreaming: false,
        messages: s.messages.map(m =>
          m.id === assistantMsg.id ? { ...m, isStreaming: false, isThinking: false } : m
        ),
      }));

      // 刷新会话列表
      get().loadSessions();
    } catch (err: any) {
      set(s => ({
        isStreaming: false,
        messages: s.messages.map(m =>
          m.id === assistantMsg.id
            ? { ...m, content: '抱歉，请求失败：' + (err.message || '未知错误'), isStreaming: false, isThinking: false }
            : m
        ),
      }));
    }
  },

  setPageContext: (ctx) => set(s => ({
    pageContext: { ...s.pageContext, ...ctx },
  })),

  confirmOperation: async (operationId: string, approved: boolean) => {
    const { sessionId } = get();
    if (!sessionId) return;
    try {
      const res: any = await assistantApi.confirmOperation(sessionId, operationId, approved);
      const status = approved ? 'confirmed' : 'rejected';
      const statusText = approved ? '已执行' : '已取消';

      // 更新消息中的 pendingOperation 状态
      set(s => ({
        messages: s.messages.map(m => {
          if (m.pendingOperation?.operationId === operationId) {
            return { ...m, pendingOperation: { ...m.pendingOperation, status } };
          }
          return m;
        }),
      }));

      // 添加结果消息
      const resultMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: approved
          ? `✅ 操作${statusText}：${res.data?.message || ''}`
          : `❌ 操作${statusText}`,
        timestamp: Date.now(),
      };
      set(s => ({ messages: [...s.messages, resultMsg] }));

      // 工作流续接：确认执行后自动让 LLM 继续后续步骤
      if (approved && res.data?.continueWorkflow) {
        await get().sendMessage('请继续执行剩余步骤');
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '操作执行失败：' + (err.message || '未知错误'),
        timestamp: Date.now(),
      };
      set(s => ({ messages: [...s.messages, errorMsg] }));
    }
  },
}));
