import React, { useMemo } from 'react';
import TagCategoryPage from '@/pages/TagCategory';
import TagDefinitionPage from '@/pages/TagDefinition';
import RuleStructuredPage from '@/pages/RuleStructured';
import RuleSemanticPage from '@/pages/RuleSemantic';
import SimulationPage from '@/pages/Simulation';
import FormalTaskPage from '@/pages/FormalTask';
import ApprovalPage from '@/pages/Approval';
import TagMigrationPage from '@/pages/TagMigration';
import TagResultPage from '@/pages/TagResult';

interface EmbeddedConfig {
  page: string;
  filters?: Record<string, string>;
  action?: string;
  prefill?: Record<string, any>;
  payload?: Record<string, any>;
}

interface Props {
  code: string;
  onNavigate?: (page: string, filters?: Record<string, string>) => void;
}

const EmbeddedRenderer: React.FC<Props> = React.memo(({ code, onNavigate }) => {
  const config = useMemo<EmbeddedConfig | null>(() => {
    try { return JSON.parse(code); }
    catch { return null; }
  }, [code]);
  const prefill = config?.prefill || config?.payload;

  if (!config) return <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>embedded 配置格式错误</span>;

  const wrap = (children: React.ReactNode) => (
    <div style={{ width: '100%', maxWidth: '100%', overflowX: 'auto' }}>{children}</div>
  );

  switch (config.page) {
    case 'tag-categories':
      return wrap(<TagCategoryPage embedded embeddedFilters={config.filters} embeddedPrefill={prefill} embeddedAction={config.action} onNavigate={onNavigate} />);
    case 'tag-definitions':
      return wrap(<TagDefinitionPage embedded embeddedFilters={config.filters} embeddedPrefill={prefill} embeddedAction={config.action} onNavigate={onNavigate} />);
    case 'rules-structured':
      return wrap(<RuleStructuredPage embedded embeddedFilters={config.filters} embeddedPrefill={prefill} embeddedAction={config.action} onNavigate={onNavigate} />);
    case 'rules-semantic':
      return wrap(<RuleSemanticPage embedded embeddedFilters={config.filters} embeddedPrefill={prefill} embeddedAction={config.action} onNavigate={onNavigate} />);
    case 'tasks-simulation':
      return wrap(<SimulationPage embedded embeddedFilters={config.filters} embeddedPrefill={prefill} embeddedAction={config.action} onNavigate={onNavigate} />);
    case 'tasks-formal':
      return wrap(<FormalTaskPage embedded embeddedFilters={config.filters} embeddedPrefill={prefill} embeddedAction={config.action} onNavigate={onNavigate} />);
    case 'approvals':
    case 'approval':
      return wrap(<ApprovalPage embedded embeddedFilters={config.filters} embeddedAction={config.action} onNavigate={onNavigate} />);
    case 'tag-migration':
      return wrap(<TagMigrationPage embedded embeddedFilters={config.filters} embeddedAction={config.action} onNavigate={onNavigate} />);
    case 'tag-results':
    case 'tag-result':
      return wrap(<TagResultPage embedded embeddedFilters={config.filters} embeddedAction={config.action} onNavigate={onNavigate} />);
    default:
      return <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>暂不支持嵌入页面: {config.page}</span>;
  }
});

export default EmbeddedRenderer;
