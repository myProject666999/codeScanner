import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error)
    return Promise.reject(error)
  }
)

export interface GitHubToken {
  id: number
  token: string
  rate_limit: number
  rate_used: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ScanTask {
  id: number
  name: string
  keywords: string
  white_list_repos: string
  white_list_files: string
  cron_expression: string
  is_active: boolean
  last_scan_time: string | null
  next_scan_time: string | null
  created_at: string
  updated_at: string
}

export interface ScanResult {
  id: number
  task_id: number
  repo_name: string
  repo_url: string
  file_path: string
  file_url: string
  match_text: string
  keyword: string
  is_handled: boolean
  handle_note: string
  scan_time: string
  created_at: string
  updated_at: string
}

export interface NotificationConfig {
  id: number
  type: string
  is_enabled: boolean
  config: string
  created_at: string
  updated_at: string
}

export interface ProxyConfig {
  id: number
  type: string
  url: string
  username: string
  password: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface DashboardStats {
  total_tasks: number
  active_tasks: number
  total_results: number
  unhandled_results: number
  recent_results: ScanResult[]
}

export const tokenApi = {
  list: () => api.get<GitHubToken[]>('/tokens'),
  create: (data: Partial<GitHubToken>) => api.post<GitHubToken>('/tokens', data),
  update: (id: number, data: Partial<GitHubToken>) => api.put<GitHubToken>(`/tokens/${id}`, data),
  delete: (id: number) => api.delete(`/tokens/${id}`),
}

export const taskApi = {
  list: () => api.get<ScanTask[]>('/tasks'),
  get: (id: number) => api.get<ScanTask>(`/tasks/${id}`),
  create: (data: Partial<ScanTask>) => api.post<ScanTask>('/tasks', data),
  update: (id: number, data: Partial<ScanTask>) => api.put<ScanTask>(`/tasks/${id}`, data),
  delete: (id: number) => api.delete(`/tasks/${id}`),
  run: (id: number) => api.post(`/tasks/${id}/run`),
}

export const resultApi = {
  list: (params?: { page?: number; page_size?: number; task_id?: number; is_handled?: string }) =>
    api.get<{ data: ScanResult[]; total: number; page: number; page_size: number }>('/results', { params }),
  get: (id: number) => api.get<ScanResult>(`/results/${id}`),
  handle: (id: number, data: { is_handled: boolean; handle_note?: string }) =>
    api.put<ScanResult>(`/results/${id}/handle`, data),
  batchHandle: (data: { ids: number[]; is_handled: boolean; handle_note?: string }) =>
    api.post('/results/batch-handle', data),
}

export const notificationApi = {
  list: () => api.get<NotificationConfig[]>('/notifications'),
  update: (id: number, data: Partial<NotificationConfig>) =>
    api.put<NotificationConfig>(`/notifications/${id}`, data),
  test: () => api.post('/notifications/test'),
}

export const proxyApi = {
  get: () => api.get<ProxyConfig>('/proxy'),
  update: (data: Partial<ProxyConfig>) => api.put<ProxyConfig>('/proxy', data),
}

export const dashboardApi = {
  getStats: () => api.get<DashboardStats>('/dashboard/stats'),
}

export const healthApi = {
  check: () => api.get('/health'),
}

export default api
