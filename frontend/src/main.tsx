import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import App from './App';
import 'antd/dist/reset.css';
import './global.css';

const darkAITheme = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: '#22d3ee',
    colorSuccess: '#10b981',
    colorWarning: '#f59e0b',
    colorError: '#ef4444',
    colorInfo: '#06b6d4',
    colorBgContainer: 'rgba(255,255,255,0.025)',
    colorBgElevated: '#10101e',
    colorBgLayout: '#08080f',
    colorBgSpotlight: '#14142a',
    colorBorder: 'rgba(255,255,255,0.06)',
    colorBorderSecondary: 'rgba(255,255,255,0.04)',
    colorText: 'rgba(255,255,255,0.92)',
    colorTextSecondary: 'rgba(255,255,255,0.55)',
    colorTextTertiary: 'rgba(255,255,255,0.3)',
    colorTextQuaternary: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    fontFamily: "'Space Grotesk', -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif",
    fontSize: 14,
    controlHeight: 38,
    wireframe: false,
  },
  components: {
    Table: {
      headerBg: 'rgba(255,255,255,0.03)',
      headerColor: 'rgba(255,255,255,0.55)',
      rowHoverBg: 'rgba(34,211,238,0.04)',
      borderColor: 'rgba(255,255,255,0.04)',
      colorBgContainer: 'transparent',
    },
    Button: {
      primaryShadow: 'none',
      defaultShadow: 'none',
      dangerShadow: 'none',
    },
    Card: {
      headerFontSize: 14,
      colorBgContainer: 'rgba(255,255,255,0.025)',
    },
    Menu: {
      darkItemBg: 'transparent',
      darkSubMenuItemBg: 'transparent',
    },
    Modal: {
      contentBg: '#10101e',
      headerBg: 'transparent',
      footerBg: 'transparent',
    },
    Input: {
      colorBgContainer: 'rgba(255,255,255,0.04)',
    },
    Select: {
      colorBgContainer: 'rgba(255,255,255,0.04)',
      colorBgElevated: '#12121f',
    },
    Popover: {
      colorBgElevated: '#14142a',
    },
    Message: {
      colorBgElevated: '#14142a',
    },
  },
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider locale={zhCN} theme={darkAITheme}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ConfigProvider>
  </React.StrictMode>
);
