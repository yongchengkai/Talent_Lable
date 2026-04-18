import request from './request';

// 标签类目
export const categoryApi = {
  page: (params: any) => request.get('/tag-categories', { params }),
  listActive: () => request.get('/tag-categories/active'),
  getById: (id: number) => request.get(`/tag-categories/${id}`),
  create: (data: any) => request.post('/tag-categories', data),
  update: (id: number, data: any) => request.put(`/tag-categories/${id}`, data),
  updateStatus: (id: number, status: string) =>
    request.put(`/tag-categories/${id}/status`, null, { params: { status } }),
  delete: (id: number) => request.delete(`/tag-categories/${id}`),
};

// 标签定义
export const tagApi = {
  page: (params: any) => request.get('/tag-definitions', { params }),
  getById: (id: number) => request.get(`/tag-definitions/${id}`),
  create: (data: any) => request.post('/tag-definitions', data),
  update: (id: number, data: any) => request.put(`/tag-definitions/${id}`, data),
  updateStatus: (id: number, status: string) =>
    request.put(`/tag-definitions/${id}/status`, null, { params: { status } }),
  delete: (id: number) => request.delete(`/tag-definitions/${id}`),
  migrate: (tagIds: number[], targetCategoryId: number) =>
    request.post('/tag-definitions/migrate', tagIds, { params: { targetCategoryId } }),
  getRules: (id: number) => request.get(`/tag-definitions/${id}/rules`),
};

// 打标规则
export const ruleApi = {
  page: (params: any) => request.get('/tag-rules', { params }),
  getById: (id: number) => request.get(`/tag-rules/${id}`),
  create: (data: any) => request.post('/tag-rules', data),
  update: (id: number, data: any) => request.put(`/tag-rules/${id}`, data),
  publish: (id: number) => request.post(`/tag-rules/${id}/publish`),
  stop: (id: number) => request.post(`/tag-rules/${id}/stop`),
  copy: (id: number) => request.post(`/tag-rules/${id}/copy`),
  delete: (id: number) => request.delete(`/tag-rules/${id}`),
  getOutputTags: (id: number) => request.get(`/tag-rules/${id}/output-tags`),
  saveOutputTags: (id: number, tagIds: number[]) => request.put(`/tag-rules/${id}/output-tags`, tagIds),
};

// 执行任务
export const taskApi = {
  page: (params: any) => request.get('/calc-tasks', { params }),
  getById: (id: number) => request.get(`/calc-tasks/${id}`),
  create: (data: any) => request.post('/calc-tasks', data),
  run: (id: number) => request.post(`/calc-tasks/${id}/run`),
  submit: (id: number) => request.post(`/calc-tasks/${id}/submit`),
  delete: (id: number) => request.delete(`/calc-tasks/${id}`),
  getRules: (id: number) => request.get(`/calc-tasks/${id}/rules`),
};

// AI 服务
export const aiApi = {
  generateDsl: (data: { naturalLanguage: string; context?: string }) =>
    request.post('/ai/generate-dsl', data),
  semanticTag: (data: { inputText: string; candidateTags: string[]; promptTemplate?: string }) =>
    request.post('/ai/semantic-tag', data),
  planScheme: (data: { scenario: string; painPoints: string; existingData?: string }) =>
    request.post('/ai/plan-scheme', data),
};

// 技能管理
export const skillApi = {
  page: (params: any) => request.get('/skills', { params }),
  getById: (id: number) => request.get(`/skills/${id}`),
  create: (data: any) => request.post('/skills', data),
  update: (id: number, data: any) => request.put(`/skills/${id}`, data),
  delete: (id: number) => request.delete(`/skills/${id}`),
  toggleEnabled: (id: number) => request.put(`/skills/${id}/toggle`),
};

// AI 助手
export const assistantApi = {
  createSession: () => request.post('/assistant/sessions'),
  listSessions: () => request.get('/assistant/sessions'),
  getMessages: (sessionId: string) => request.get(`/assistant/sessions/${sessionId}/messages`),
  deleteSession: (sessionId: string) => request.delete(`/assistant/sessions/${sessionId}`),
  confirmOperation: (sessionId: string, operationId: string, approved: boolean) =>
    request.post(`/assistant/sessions/${sessionId}/confirm/${operationId}`, null, { params: { approved } }),
};

// 模型配置
export const modelConfigApi = {
  page: (params: any) => request.get('/model-configs', { params }),
  getById: (id: number) => request.get(`/model-configs/${id}`),
  listActive: () => request.get('/model-configs/active'),
  create: (data: any) => request.post('/model-configs', data),
  update: (id: number, data: any) => request.put(`/model-configs/${id}`, data),
  delete: (id: number) => request.delete(`/model-configs/${id}`),
  setDefault: (id: number) => request.put(`/model-configs/${id}/default`),
  testConnection: (id: number) => request.post(`/model-configs/${id}/test`),
};

// 变更通知
export const notificationApi = {
  page: (params: any) => request.get('/notifications', { params }),
  unreadCount: () => request.get('/notifications/unread-count'),
  getById: (id: number) => request.get(`/notifications/${id}`),
  markRead: (id: number) => request.put(`/notifications/${id}/read`),
  markAllRead: () => request.put('/notifications/read-all'),
  dismiss: (id: number) => request.put(`/notifications/${id}/dismiss`),
};

// 文档管理
export const docApi = {
  list: () => request.get('/docs'),
  read: (filename: string) => request.get(`/docs/${encodeURIComponent(filename)}`),
  save: (filename: string, content: string) => request.put(`/docs/${encodeURIComponent(filename)}`, { content }),
};

// 员工
export const employeeApi = {
  page: (params: any) => request.get('/employees', { params }),
  orgTree: () => request.get('/employees/org-tree'),
};
