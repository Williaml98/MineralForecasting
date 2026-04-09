/** Role types matching the backend Role enum */
export type Role = 'ADMIN' | 'ANALYST' | 'STRATEGIST' | 'EXECUTIVE';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  mustChangePassword: boolean;
  lastLogin?: string;
  createdAt: string;
  avatarUrl?: string;
}

export interface Dataset {
  id: string;
  name: string;
  source?: string;
  version: number;
  uploadedBy?: string;
  uploadedAt: string;
  rowCount?: number;
  status: 'PENDING' | 'VALIDATED' | 'INVALID' | 'DELETED';
  filePath?: string;
  hasFile: boolean;
}

export interface Pipeline {
  id: string;
  name: string;
  datasetId?: string;
  configJson?: string;
  createdBy?: string;
  createdAt: string;
  version: number;
  status: string;
}

export interface TrainedModel {
  id: string;
  name: string;
  algorithm: 'ARIMA' | 'ETS' | 'LSTM';
  datasetId?: string;
  pipelineId?: string;
  hyperparamsJson?: string;
  metricsJson?: string;
  active: boolean;
  trainedBy?: string;
  trainedAt?: string;
  version: number;
  jobId?: string;
  status: string;
}

export interface Forecast {
  id: string;
  modelId: string;
  modelName?: string;
  horizonMonths: number;
  forecastJson?: string;
  confidenceIntervalsJson?: string;
  createdBy?: string;
  createdAt: string;
}

export interface ForecastPoint {
  date: string;
  value: number;
  lower80: number;
  upper80: number;
  lower95: number;
  upper95: number;
}

export interface Scenario {
  id: string;
  name: string;
  baseForecastId?: string;
  parametersJson?: string;
  resultJson?: string;
  notes?: string;
  flaggedForReview: boolean;
  createdBy?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId?: string;
  actionType: string;
  entityType?: string;
  entityId?: string;
  detail?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}
