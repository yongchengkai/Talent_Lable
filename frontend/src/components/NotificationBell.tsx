import { useState, useEffect } from 'react';
import { Badge, Popover, List, Tag, Button, Empty, Spin } from 'antd';
import { BellOutlined, CloseOutlined, RobotOutlined } from '@ant-design/icons';
import { useNotificationStore, type ChangeNotification } from '@/stores/notificationStore';
import { useAssistantStore } from '@/stores/assistantStore';

const severityConfig: Record<string, { color: string; label: string }> = {
  CRITICAL: { color: '#ef4444', label: '紧急' },
  WARN: { color: '#f59e0b', label: '警告' },
  INFO: { color: '#0ea5e9', label: '信息' },
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  return `${Math.floor(diff / 86400)} 天前`;
}

interface NotificationBellProps {
  onOpenChat?: (message: string, notificationId: number) => void;
}

export default function NotificationBell({ onOpenChat }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const { unreadCount, notifications, loading, fetchNotifications, markRead, markAllRead, dismiss } = useNotificationStore();
  const assistantStore = useAssistantStore();

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open]);

  const handleClickNotification = async (n: ChangeNotification) => {
    if (n.status === 'UNREAD') await markRead(n.id);
    setOpen(false);

    const message = `请分析变更通知 #${n.id}：${n.changeSummary}`;
    if (onOpenChat) {
      onOpenChat(message, n.id);
    } else {
      assistantStore.setPageContext({
        currentPage: '/notifications',
        filters: { notificationId: String(n.id) },
      });
      assistantStore.sendMessage(message);
    }
  };

  const content = (
    <div style={{ width: 380 }}>
      {/* 头部 */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>
          变更通知
          {unreadCount > 0 && (
            <span style={{ fontSize: 12, color: '#0ea5e9', marginLeft: 8 }}>{unreadCount} 条未读</span>
          )}
        </span>
        {unreadCount > 0 && (
          <Button type="link" size="small" onClick={markAllRead}
            style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', padding: 0 }}>
            全部已读
          </Button>
        )}
      </div>

      {/* 列表 */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center' }}><Spin size="small" /></div>
      ) : notifications.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无通知"
          style={{ padding: '32px 0' }} />
      ) : (
        <List
          dataSource={notifications}
          style={{ maxHeight: 400, overflowY: 'auto' }}
          renderItem={(n: ChangeNotification) => {
            const sev = severityConfig[n.severity] || severityConfig.INFO;
            const isUnread = n.status === 'UNREAD';
            return (
              <div
                key={n.id}
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  background: isUnread ? 'rgba(14, 165, 233, 0.04)' : 'transparent',
                  transition: 'background 0.2s',
                  position: 'relative',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(14, 165, 233, 0.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = isUnread ? 'rgba(14, 165, 233, 0.04)' : 'transparent'; }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  {/* 未读指示点 */}
                  {isUnread && (
                    <div style={{
                      width: 6, height: 6, borderRadius: '50%', marginTop: 6, flexShrink: 0,
                      background: sev.color,
                      boxShadow: `0 0 6px ${sev.color}60`,
                    }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }} onClick={() => handleClickNotification(n)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <Tag color={sev.color} style={{
                        fontSize: 10, lineHeight: '16px', padding: '0 4px',
                        border: 'none', borderRadius: 3,
                      }}>
                        {sev.label}
                      </Tag>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
                        {timeAgo(n.createdAt)}
                      </span>
                    </div>
                    <div style={{
                      fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.5,
                      overflow: 'hidden', textOverflow: 'ellipsis',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    }}>
                      {n.changeSummary}
                    </div>
                    {n.affectedRules?.length > 0 && (
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
                        影响 {n.affectedRules.length} 条规则
                      </div>
                    )}
                  </div>
                  {/* 操作按钮 */}
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0, marginTop: 2 }}>
                    <Button type="text" size="small" onClick={(e) => { e.stopPropagation(); handleClickNotification(n); }}
                      style={{ color: '#0ea5e9', fontSize: 12, padding: '0 4px', height: 22 }}
                      icon={<RobotOutlined style={{ fontSize: 12 }} />}
                      title="AI 分析"
                    />
                    <Button type="text" size="small" onClick={(e) => { e.stopPropagation(); dismiss(n.id); }}
                      style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, padding: '0 4px', height: 22 }}
                      icon={<CloseOutlined style={{ fontSize: 10 }} />}
                      title="忽略"
                    />
                  </div>
                </div>
              </div>
            );
          }}
        />
      )}
    </div>
  );

  return (
    <Popover
      content={content}
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement="bottomRight"
      overlayStyle={{ padding: 0 }}
      overlayInnerStyle={{
        background: '#0f0f1a',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        padding: 0,
        overflow: 'hidden',
      }}
    >
      <div style={{
        position: 'relative', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 32, height: 32, borderRadius: 8,
        transition: 'background 0.2s',
      }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
      >
        <Badge count={unreadCount} size="small" offset={[2, -2]}
          style={{ boxShadow: 'none', fontSize: 10 }}>
          <BellOutlined style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)' }} />
        </Badge>
      </div>
    </Popover>
  );
}
