import { useState, useEffect, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button } from 'antd';
import {
  TagsOutlined,
  TagOutlined,
  AppstoreOutlined,
  SwapOutlined,
  FileTextOutlined,
  FilterOutlined,
  RobotOutlined,
  ThunderboltOutlined,
  ExperimentOutlined,
  CheckCircleOutlined,
  SafetyOutlined,
  LockOutlined,
  MessageOutlined,
  ToolOutlined,
  ApiOutlined,
  ArrowLeftOutlined,
  CloseOutlined,
  ReadOutlined,
  BookOutlined,
} from '@ant-design/icons';
import SplitChatPanel from '@/components/SplitChatPanel';
import NotificationBell from '@/components/NotificationBell';
import { useNotificationStore } from '@/stores/notificationStore';
import { useAssistantStore } from '@/stores/assistantStore';

const { Sider, Content, Header } = Layout;

/** 路由 → 页面标题映射 */
const PAGE_TITLES: Record<string, string> = {
  '/app/tag-categories': '标签类目',
  '/app/tag-definitions': '标签定义',
  '/app/tag-migration': '标签迁移',
  '/app/rules/structured': '条件打标规则',
  '/app/rules/semantic': '智能打标规则',
  '/app/tasks/simulation': '模拟打标',
  '/app/tasks/formal': '正式打标',
  '/app/planning-agent': '标签规划',
  '/app/skill-management': '技能管理',
  '/app/model-config': '模型配置',
  '/app/permissions': '权限管理',
  '/app/product-docs': '产品文档',
};

interface TabItem {
  key: string;
  label: string;
}

const menuItems = [
  {
    key: 'ai-group',
    label: 'AI 助手',
    icon: <RobotOutlined />,
    children: [
      { key: '/app/planning-agent', label: '标签规划', icon: <ThunderboltOutlined /> },
      { key: '/app/skill-management', label: '技能管理', icon: <ToolOutlined /> },
      { key: '/app/model-config', label: '模型配置', icon: <ApiOutlined /> },
    ],
  },
  {
    key: 'tag-mgmt',
    label: '标签管理',
    icon: <TagsOutlined />,
    children: [
      { key: '/app/tag-categories', label: '标签类目', icon: <AppstoreOutlined /> },
      { key: '/app/tag-definitions', label: '标签定义', icon: <TagOutlined /> },
      { key: '/app/tag-migration', label: '标签迁移', icon: <SwapOutlined /> },
    ],
  },
  {
    key: 'rule-task',
    label: '规则与任务',
    icon: <FileTextOutlined />,
    children: [
      { key: '/app/rules/structured', label: '条件打标规则', icon: <FilterOutlined /> },
      { key: '/app/rules/semantic', label: '智能打标规则', icon: <RobotOutlined /> },
      { key: '/app/tasks/simulation', label: '模拟打标', icon: <ExperimentOutlined /> },
      { key: '/app/tasks/formal', label: '正式打标', icon: <CheckCircleOutlined /> },
    ],
  },
  {
    key: 'result-perm',
    label: '结果与权限',
    icon: <SafetyOutlined />,
    children: [
      { key: '/app/permissions', label: '权限管理', icon: <LockOutlined /> },
    ],
  },
  {
    key: 'docs',
    label: '文档',
    icon: <ReadOutlined />,
    children: [
      { key: '/app/product-docs', label: '产品文档', icon: <BookOutlined /> },
    ],
  },
];

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [chatOpen, setChatOpen] = useState(() => {
    try { return localStorage.getItem('splitChatOpen') === 'true'; } catch { return false; }
  });
  const [tabs, setTabs] = useState<TabItem[]>(() => {
    const title = PAGE_TITLES[location.pathname];
    return title ? [{ key: location.pathname, label: title }] : [];
  });
  const { startPolling, stopPolling } = useNotificationStore();
  const assistantStore = useAssistantStore();

  useEffect(() => {
    startPolling();
    return () => stopPolling();
  }, []);

  // 路由变化时自动添加 tab
  useEffect(() => {
    const path = location.pathname;
    const title = PAGE_TITLES[path];
    if (title && !tabs.find(t => t.key === path)) {
      setTabs(prev => [...prev, { key: path, label: title }]);
    }
  }, [location.pathname]);

  const closeTab = useCallback((key: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setTabs(prev => {
      const next = prev.filter(t => t.key !== key);
      // 如果关闭的是当前 tab，跳转到最后一个 tab 或默认页
      if (key === location.pathname && next.length > 0) {
        navigate(next[next.length - 1].key);
      } else if (key === location.pathname && next.length === 0) {
        navigate('/app/tag-categories');
      }
      return next;
    });
  }, [location.pathname, navigate]);

  const toggleChat = () => {
    const next = !chatOpen;
    setChatOpen(next);
    try { localStorage.setItem('splitChatOpen', String(next)); } catch {}
  };

  const handleNotificationOpenChat = (message: string, notificationId: number) => {
    if (!chatOpen) {
      setChatOpen(true);
      try { localStorage.setItem('splitChatOpen', 'true'); } catch {}
    }
    assistantStore.setPageContext({
      currentPage: '/notifications',
      filters: { notificationId: String(notificationId) },
    });
    setTimeout(() => assistantStore.sendMessage(message), 300);
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#08080f' }}>
      <Sider
        width={250}
        className="industrial-sidebar"
        style={{
          background: '#0a0a14',
          borderRight: '1px solid rgba(255,255,255,0.04)',
          position: 'fixed',
          left: 0, top: 0, bottom: 0,
          zIndex: 100,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Ambient glow — top */}
        <div style={{
          position: 'absolute', top: -80, left: '50%', transform: 'translateX(-50%)',
          width: 240, height: 160,
          background: 'radial-gradient(ellipse, rgba(6,182,212,0.1) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Logo */}
        <div style={{ height: 56, display: 'flex', alignItems: 'center', padding: '0 24px', gap: 12 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 10,
            background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            boxShadow: '0 0 24px rgba(6,182,212,0.3), 0 0 48px rgba(139,92,246,0.15)',
            animation: 'logoPulse 3s ease-in-out infinite',
          }}>
            <TagsOutlined style={{ color: '#fff', fontSize: 15 }} />
          </div>
          <div>
            <div style={{
              fontSize: 15, fontWeight: 700,
              background: 'linear-gradient(135deg, #22d3ee, #a78bfa)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.02em', lineHeight: 1.2,
            }}>
              人才打标
            </div>
            <div style={{
              fontSize: 9, fontWeight: 400,
              color: 'rgba(255,255,255,0.25)',
              letterSpacing: '0.14em', textTransform: 'uppercase',
            }}>
              Talent Label
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{
          height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(6,182,212,0.2), rgba(139,92,246,0.15), transparent)',
          margin: '0 16px 8px',
          boxShadow: '0 0 8px rgba(6,182,212,0.1)',
        }} />

        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          defaultOpenKeys={['ai-group', 'tag-mgmt', 'rule-task', 'result-perm', 'docs']}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 0, background: 'transparent' }}
        />

        {/* Ambient glow — bottom */}
        <div style={{
          position: 'absolute', bottom: -60, left: '50%', transform: 'translateX(-50%)',
          width: 180, height: 120,
          background: 'radial-gradient(ellipse, rgba(139,92,246,0.07) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <style>{`
          @keyframes logoPulse {
            0%, 100% { box-shadow: 0 0 24px rgba(6,182,212,0.3), 0 0 48px rgba(139,92,246,0.15); }
            50% { box-shadow: 0 0 32px rgba(6,182,212,0.45), 0 0 64px rgba(139,92,246,0.25); }
          }
          .industrial-sidebar .ant-menu-inline { border-right: none !important; }
          .industrial-sidebar .ant-menu-item,
          .industrial-sidebar .ant-menu-submenu-title {
            color: rgba(255,255,255,0.45) !important; border-radius: 8px !important;
            margin: 2px 12px !important; padding-left: 16px !important;
            height: 38px !important; line-height: 38px !important;
            font-size: 13px !important; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
          }
          .industrial-sidebar .ant-menu-item:hover,
          .industrial-sidebar .ant-menu-submenu-title:hover {
            color: rgba(255,255,255,0.9) !important; background: rgba(6,182,212,0.08) !important;
          }
          .industrial-sidebar .ant-menu-item-selected {
            color: #22d3ee !important;
            background: linear-gradient(135deg, rgba(6,182,212,0.15), rgba(139,92,246,0.1)) !important;
            box-shadow: 0 0 16px rgba(6,182,212,0.1), inset 0 0 0 1px rgba(6,182,212,0.15) !important;
            font-weight: 600 !important;
          }
          .industrial-sidebar .ant-menu-item-selected .anticon {
            color: #22d3ee !important; filter: drop-shadow(0 0 6px rgba(34,211,238,0.5)) !important;
          }
          .industrial-sidebar .ant-menu-submenu > .ant-menu-submenu-title {
            font-size: 13px !important; font-weight: 700 !important;
            letter-spacing: 0.08em !important; text-transform: uppercase !important;
            color: rgba(255,255,255,0.25) !important; height: 36px !important;
            line-height: 36px !important; margin-top: 12px !important;
          }
          .industrial-sidebar .ant-menu-submenu > .ant-menu-submenu-title:hover {
            color: rgba(255,255,255,0.5) !important; background: transparent !important;
          }
          .industrial-sidebar .ant-menu-submenu > .ant-menu-submenu-title .anticon {
            font-size: 13px !important; color: rgba(255,255,255,0.2) !important; transition: all 0.3s !important;
          }
          .industrial-sidebar .ant-menu-submenu-open > .ant-menu-submenu-title .anticon {
            color: rgba(6,182,212,0.6) !important; filter: drop-shadow(0 0 4px rgba(6,182,212,0.3)) !important;
          }
          .industrial-sidebar .ant-menu-item .anticon {
            font-size: 15px !important; transition: all 0.3s !important;
          }
          .industrial-sidebar .ant-menu-item:hover .anticon {
            color: rgba(6,182,212,0.8) !important; transform: scale(1.1) !important;
          }
          .industrial-sidebar .ant-menu-submenu-arrow { color: rgba(255,255,255,0.15) !important; }
          .industrial-sidebar .ant-menu-submenu-open > .ant-menu-submenu-title > .ant-menu-submenu-arrow {
            color: rgba(6,182,212,0.4) !important;
          }
          .industrial-sidebar .ant-menu-sub.ant-menu-inline { background: transparent !important; }
          .industrial-sidebar .ant-menu-sub .ant-menu-item { padding-left: 44px !important; }
        `}</style>
      </Sider>

      <Layout style={{ marginLeft: 250, background: 'transparent', transition: 'margin-right 0.3s' }}>
        <Header style={{
          background: 'rgba(8,8,15,0.75)',
          backdropFilter: 'blur(16px) saturate(130%)',
          WebkitBackdropFilter: 'blur(16px) saturate(130%)',
          padding: 0, height: 'auto', lineHeight: 'normal',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          position: 'sticky', top: 0, zIndex: 50,
        }}>
          {/* 顶部工具栏 */}
          <div style={{
            height: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 24px',
          }}>
            <Button size="small" onClick={() => navigate('/')}
              style={{
                background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
                border: 'none', color: '#fff', fontWeight: 500, borderRadius: 6,
                boxShadow: '0 2px 8px rgba(6,182,212,0.2)',
                fontSize: 12, height: 28, padding: '0 12px',
              }}>
              <ArrowLeftOutlined /> AI 对话
            </Button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <NotificationBell onOpenChat={handleNotificationOpenChat} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 10,
                  background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, color: '#fff', fontWeight: 700,
                  boxShadow: '0 2px 10px rgba(6,182,212,0.2)',
                }}>A</div>
                <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 600 }}>管理员</div>
              </div>
            </div>
          </div>

          {/* Tab 栏 */}
          {tabs.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', padding: '0 16px',
              height: 36, gap: 2, overflowX: 'auto',
              borderTop: '1px solid rgba(255,255,255,0.03)',
            }}>
              {tabs.map(tab => {
                const isActive = tab.key === location.pathname;
                return (
                  <div
                    key={tab.key}
                    onClick={() => navigate(tab.key)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '0 12px', height: 28, borderRadius: '6px 6px 0 0',
                      cursor: 'pointer', fontSize: 12, fontWeight: isActive ? 600 : 400,
                      color: isActive ? '#22d3ee' : 'rgba(255,255,255,0.4)',
                      background: isActive ? 'rgba(6,182,212,0.1)' : 'transparent',
                      borderBottom: isActive ? '2px solid #22d3ee' : '2px solid transparent',
                      transition: 'all 0.2s',
                      whiteSpace: 'nowrap', flexShrink: 0,
                    }}
                  >
                    <span>{tab.label}</span>
                    <span
                      onClick={(e) => closeTab(tab.key, e)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: 16, height: 16, borderRadius: 4,
                        color: isActive ? 'rgba(34,211,238,0.6)' : 'rgba(255,255,255,0.2)',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                        e.currentTarget.style.color = 'rgba(255,255,255,0.8)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = isActive ? 'rgba(34,211,238,0.6)' : 'rgba(255,255,255,0.2)';
                      }}
                    >
                      <CloseOutlined style={{ fontSize: 8 }} />
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Header>

        <div style={{ display: 'flex', flex: 1 }}>
          <Content style={{
            flex: 1,
            margin: 24, padding: 28,
            background: 'rgba(255,255,255,0.015)',
            borderRadius: 16, minHeight: 360,
            border: '1px solid rgba(255,255,255,0.04)',
            position: 'relative', overflow: 'hidden',
            zIndex: 1,
          }}>
            <div style={{
              position: 'absolute', top: -50, right: -50, width: 250, height: 250,
              background: 'radial-gradient(circle, rgba(6,182,212,0.04) 0%, transparent 60%)',
              pointerEvents: 'none',
            }} />
            <div style={{
              position: 'absolute', bottom: -50, left: -50, width: 200, height: 200,
              background: 'radial-gradient(circle, rgba(139,92,246,0.03) 0%, transparent 60%)',
              pointerEvents: 'none',
            }} />
            <Outlet />
          </Content>
        </div>
      </Layout>

      {/* 浮动 AI 对话面板 */}
      {chatOpen && (
        <>
          <div onClick={toggleChat} style={{
            position: 'fixed', inset: 0, zIndex: 299,
            background: 'rgba(0,0,0,0.25)', transition: 'opacity 0.3s',
          }} />
          <div style={{
            position: 'fixed', top: 16, right: 16, bottom: 16, width: 420, zIndex: 300,
            borderRadius: 16, overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.3), 0 0 24px rgba(6,182,212,0.1)',
          }}>
            <SplitChatPanel onClose={toggleChat} />
          </div>
        </>
      )}

      {/* 悬浮 AI 按钮 */}
      {!chatOpen && (
        <div
          onClick={toggleChat}
          style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 200,
            width: 52, height: 52, borderRadius: 16, cursor: 'pointer',
            background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 24px rgba(6,182,212,0.4), 0 0 48px rgba(139,92,246,0.15)',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 6px 32px rgba(6,182,212,0.5), 0 0 64px rgba(139,92,246,0.25)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(6,182,212,0.4), 0 0 48px rgba(139,92,246,0.15)'; }}
        >
          <MessageOutlined style={{ color: '#fff', fontSize: 22 }} />
        </div>
      )}
    </Layout>
  );
}
