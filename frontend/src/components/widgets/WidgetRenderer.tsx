import React, { useMemo } from 'react';
import LinkWidget from './LinkWidget';
import CategoryListWidget from './CategoryListWidget';

interface WidgetConfig {
  type: string;
  [key: string]: any;
}

interface Props {
  code: string;
  onNavigate?: (page: string, filters?: Record<string, string>) => void;
}

const WidgetRenderer: React.FC<Props> = React.memo(({ code, onNavigate }) => {
  const config = useMemo<WidgetConfig | null>(() => {
    try { return JSON.parse(code); }
    catch { return null; }
  }, [code]);

  if (!config) return <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>widget 数据格式错误</span>;

  switch (config.type) {
    case 'link':
      return <LinkWidget page={config.page} filters={config.filters} label={config.label} onNavigate={onNavigate} />;
    case 'category-list':
      return <CategoryListWidget filters={config.filters} limit={config.limit} onNavigate={onNavigate} />;
    default:
      return <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>不支持的 widget 类型: {config.type}</span>;
  }
});

export default WidgetRenderer;
