import { create } from 'zustand';
import { notificationApi } from '@/services/api';

export interface ChangeNotification {
  id: number;
  employeeId: number;
  employeeNo: string;
  employeeName: string;
  changeType: string;
  changeSummary: string;
  changedFields: Array<{ field: string; fieldName: string; old: string; new: string }>;
  affectedRules: Array<{ ruleId: number; ruleName: string; ruleType: string; reason: string }>;
  severity: 'INFO' | 'WARN' | 'CRITICAL';
  status: string;
  createdAt: string;
}

interface NotificationState {
  unreadCount: number;
  notifications: ChangeNotification[];
  loading: boolean;
  _pollTimer: ReturnType<typeof setInterval> | null;

  fetchUnreadCount: () => Promise<void>;
  fetchNotifications: (params?: any) => Promise<void>;
  markRead: (id: number) => Promise<void>;
  markAllRead: () => Promise<void>;
  dismiss: (id: number) => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  unreadCount: 0,
  notifications: [],
  loading: false,
  _pollTimer: null,

  fetchUnreadCount: async () => {
    try {
      const res: any = await notificationApi.unreadCount();
      set({ unreadCount: res.data ?? 0 });
    } catch { /* ignore */ }
  },

  fetchNotifications: async (params?: any) => {
    set({ loading: true });
    try {
      const res: any = await notificationApi.page({ current: 1, size: 10, ...params });
      const records = res.data?.records ?? [];
      const parsed = records.map((n: any) => ({
        ...n,
        changedFields: typeof n.changedFields === 'string' ? JSON.parse(n.changedFields) : n.changedFields,
        affectedRules: typeof n.affectedRules === 'string' ? JSON.parse(n.affectedRules) : n.affectedRules,
      }));
      set({ notifications: parsed });
    } catch {
      set({ notifications: [] });
    } finally {
      set({ loading: false });
    }
  },

  markRead: async (id: number) => {
    try {
      await notificationApi.markRead(id);
      set(s => ({
        notifications: s.notifications.map(n => n.id === id ? { ...n, status: 'READ' } : n),
        unreadCount: Math.max(0, s.unreadCount - 1),
      }));
    } catch { /* ignore */ }
  },

  markAllRead: async () => {
    try {
      await notificationApi.markAllRead();
      set(s => ({
        notifications: s.notifications.map(n => n.status === 'UNREAD' ? { ...n, status: 'READ' } : n),
        unreadCount: 0,
      }));
    } catch { /* ignore */ }
  },

  dismiss: async (id: number) => {
    try {
      await notificationApi.dismiss(id);
      set(s => ({
        notifications: s.notifications.filter(n => n.id !== id),
        unreadCount: s.notifications.find(n => n.id === id)?.status === 'UNREAD'
          ? Math.max(0, s.unreadCount - 1) : s.unreadCount,
      }));
    } catch { /* ignore */ }
  },

  startPolling: () => {
    const { _pollTimer, fetchUnreadCount, fetchNotifications } = get();
    if (_pollTimer) return;
    fetchUnreadCount();
    fetchNotifications();
    const timer = setInterval(() => {
      fetchUnreadCount();
    }, 30_000);
    set({ _pollTimer: timer });
  },

  stopPolling: () => {
    const { _pollTimer } = get();
    if (_pollTimer) {
      clearInterval(_pollTimer);
      set({ _pollTimer: null });
    }
  },
}));
