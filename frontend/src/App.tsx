import { Routes, Route, Navigate } from 'react-router-dom';
import ChatLayout from './layouts/ChatLayout';
import MainLayout from './layouts/MainLayout';
import TagCategoryPage from './pages/TagCategory';
import TagDefinitionPage from './pages/TagDefinition';
import TagMigrationPage from './pages/TagMigration';
import RuleStructuredPage from './pages/RuleStructured';
import RuleSemanticPage from './pages/RuleSemantic';
import SimulationPage from './pages/Simulation';
import FormalTaskPage from './pages/FormalTask';
import PlanningAgentPage from './pages/PlanningAgent';
import PermissionPage from './pages/Permission';
import SkillManagementPage from './pages/SkillManagement';
import ModelConfigPage from './pages/ModelConfig';
import ProductDocsPage from './pages/ProductDocs';

export default function App() {
  return (
    <Routes>
      {/* AI 对话全屏页 — 默认首页 */}
      <Route path="/" element={<ChatLayout />} />

      {/* 系统管理页 */}
      <Route path="/app" element={<MainLayout />}>
        <Route index element={<Navigate to="/app/tag-categories" replace />} />
        <Route path="tag-categories" element={<TagCategoryPage />} />
        <Route path="tag-definitions" element={<TagDefinitionPage />} />
        <Route path="tag-migration" element={<TagMigrationPage />} />
        <Route path="rules/structured" element={<RuleStructuredPage />} />
        <Route path="rules/semantic" element={<RuleSemanticPage />} />
        <Route path="tasks/simulation" element={<SimulationPage />} />
        <Route path="tasks/formal" element={<FormalTaskPage />} />
        <Route path="planning-agent" element={<PlanningAgentPage />} />
        <Route path="permissions" element={<PermissionPage />} />
        <Route path="skill-management" element={<SkillManagementPage />} />
        <Route path="model-config" element={<ModelConfigPage />} />
        <Route path="product-docs" element={<ProductDocsPage />} />
      </Route>
    </Routes>
  );
}
