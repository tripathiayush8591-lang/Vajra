import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/v1";
export const MEDIA_BASE_URL =
  import.meta.env.VITE_MEDIA_BASE_URL ||
  (API_BASE_URL.startsWith("http")
    ? API_BASE_URL.replace(/\/api\/v1\/?$/, "/media")
    : "/media");

const api = axios.create({ baseURL: API_BASE_URL });

export interface Hotspot {
  id: number;
  title: string;
  ward: { id: number; name: string; zone: string };
  category: string;
  centroid: { lat: number; lng: number };
  radius_m: number;
  complaint_count: number;
  avg_severity: number;
  priority_score: number;
  components: Record<string, number>;
  evidence: string;
  temporal: { count?: number; last_48h?: number; accelerating?: boolean; trend_pct?: number };
  status: string;
  sample_audio_ref: string | null;
  complaints?: { id: number; summary: string; severity: number; channel: string }[];
}

export interface PipelineTrace {
  submission_id: string;
  status: string;
  current_stage: number;
  stages: { stage: number; name: string; status: string; ms: number; agents: TraceAgent[] }[];
  record: Record<string, any> | null;
  result: { complaint_id?: number; tracking_code?: string; hotspot_id?: number; priority_score?: number; department?: string } | null;
}

export interface TraceAgent {
  agent: string;
  stage: number;
  status: string;
  ms: number;
  summary: string;
}

export const submitComplaint = (form: FormData) =>
  api.post<{ submission_id: string; trace_url: string }>("/complaints/submit", form);

export const getTrace = (id: string) => api.get<PipelineTrace>(`/pipeline/${id}`);

export const getHotspots = () => api.get<{ hotspots: Hotspot[] }>("/hotspots");

export const getHotspot = (id: number) => api.get<Hotspot>(`/hotspots/${id}`);

export const getAnalytics = () =>
  api.get("/analytics/summary").then((r) => r.data);

export const whatIf = (id: number, resolved: number) =>
  api.post(`/hotspots/${id}/whatif`, { resolved_complaints: resolved }).then((r) => r.data);

export const copilotChat = (query: string) =>
  api.post<{ answer: string; draft_work_order: any; llm_mode: string }>("/assistant/chat", { query }).then((r) => r.data);

export const getSystem = () => api.get<{ llm_mode: string; offline_mode: boolean }>("/admin/system");

export const setOffline = (offline: boolean) =>
  api.post<{ llm_mode: string; offline_mode: boolean }>("/admin/system", { offline_mode: offline });

export const trackCode = (code: string) =>
  api.get(`/complaints/${code}`).then((r) => r.data).catch(() => null);

export interface ComplaintItem {
  id: number;
  tracking_code: string;
  submission_id: string;
  category: string;
  subcategory?: string | null;
  summary: string;
  raw_text?: string | null;
  severity: number;
  urgency: string;
  ward?: string | null;
  ward_id?: number | null;
  zone?: string | null;
  status: string;
  department: string;
  channel: string;
  photo_path?: string | null;
  audio_path?: string | null;
  citizen_phone_masked?: string | null;
  ai_metadata?: any;
  lat: number;
  lng: number;
  cluster_id?: number | null;
  created_at: string;
  updated_at: string;
}

export interface ComplaintDetail extends ComplaintItem {
  timeline: {
    status: string;
    at: string;
    notes?: string;
    by?: string;
  }[];
  resolution_photo?: string | null;
}

export const getComplaints = (params?: {
  ward?: number;
  category?: string;
  status?: string;
  search?: string;
  page?: number;
  page_size?: number;
}) =>
  api
    .get<{ total: number; page: number; page_size: number; complaints: ComplaintItem[] }>("/complaints", { params })
    .then((r) => r.data);

export const getComplaint = (codeOrId: string | number) =>
  api.get<ComplaintDetail>(`/complaints/${codeOrId}`).then((r) => r.data);

export const updateComplaintStatus = (
  complaintId: number,
  status: string,
  notes?: string,
  officerName?: string
) =>
  api
    .patch(`/complaints/${complaintId}/status`, {
      status,
      notes,
      officer_name: officerName,
    })
    .then((r) => r.data);

export const createAction = (hotspot_id: number, action_type: string, budget = 0) =>
  api.post("/admin/actions", { hotspot_id, action_type, budget_allocated: budget }).then((r) => r.data);

export default api;

