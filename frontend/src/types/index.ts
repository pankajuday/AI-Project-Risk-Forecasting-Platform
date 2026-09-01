//  API Types (matching backend models)

export type ProjectStatus =
  | 'created'
  | 'uploading'
  | 'indexing'
  | 'analysis_pending'
  | 'analysis_running'
  | 'analysis_ready'
  | 'completed'
  | 'archived'
  | 'failed';

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  total_files: number;
  total_chunks: number;
  current_health_score?: number;
  created_at: string;
  updated_at: string;
}

export type DocumentStatus = 'pending' | 'processing' | 'indexed' | 'completed' | 'failed';
export type FileType = 'pdf' | 'docx' | 'txt' | 'md' | 'csv' | 'xlsx' | 'image' | 'pptx' | 'other';

export interface DocumentRecord {
  id: string;
  project_id: string;
  filename: string;
  original_name: string;
  file_type: FileType;
  file_size: number;
  mime_type: string;
  processing_status: DocumentStatus;
  processing_error?: string;
  chunk_count: number;
  created_at: string;
}

export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical';
export type RiskCategory = 'technical' | 'resource' | 'schedule' | 'scope' | 'external' | 'quality';

export interface RiskItem {
  title: string;
  description: string;
  category: RiskCategory;
  severity: RiskSeverity;
  probability: string;
  impact: string;
  mitigation: string;
  source_context?: string;
}

export interface ScopeOutput {
  project_name?: string;
  objectives: string[];
  deliverables: string[];
  timeline?: string;
  stakeholders: string[];
  out_of_scope: string[];
  summary?: string;
}

export interface HealthBreakdown {
  schedule_risk_percent: number;
  scope_clarity_percent: number;
  documentation_completeness_percent: number;
  risk_density_percent: number;
}

export interface GeneratedDocument {
  title: string;
  doc_type: string;
  content: string;
  created_at: string;
}

export type AnalysisStatus = 'pending' | 'running' | 'ready' | 'failed';

export interface AnalysisReport {
  id: string;
  project_id: string;
  status: AnalysisStatus;
  error_message?: string;
  scope?: ScopeOutput;
  risks: RiskItem[];
  health_score?: number;
  health_breakdown?: HealthBreakdown;
  generated_documents: GeneratedDocument[];
  created_at: string;
  completed_at?: string;
}

export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  role: MessageRole;
  content: string;
  timestamp: string;
  sources: string[];
}

//  UI-only types

export type ViewName =
  | 'Upload'
  | 'documents'
  | 'insights'
  | 'risks'
  | 'scope'
  | 'stories'
  | 'forecast'
  | 'members'
  | 'settings';

export interface RiskEvent {
  id: string;
  risk_id: string;
  type: string;
  actor?: string;
  from_value?: string;
  to_value?: string;
  note?: string;
  created_at: string;
}

export interface TrackedRisk {
  id: string;
  project_id: string;
  fingerprint: string;
  title: string;
  description: string;
  category: string;
  severity: RiskSeverity;
  probability: string;
  impact: string;
  source_context?: string;
  mitigation?: string;
  status: 'open' | 'mitigating' | 'resolved' | 'accepted' | 'stale';
  owner_name?: string;
  due_date?: string;
  closure_note?: string;
  occurrences: number;
  missed_runs: number;
  peak_severity: string;
  first_seen_at: string;
  last_seen_at: string;
  closed_at?: string;
  created_at: string;
  updated_at: string;
  events?: RiskEvent[]; // Used when fetching a single risk
}

export interface RiskSummary {
  total: number;
  by_status: Record<string, number>;
  by_category: Record<string, number>;
  unowned: number;
  overdue: number;
}
