/**
 * Tipos compartilhados de ponto.
 */

export type AttendanceType = 'ENTRY' | 'BREAK_START' | 'BREAK_END' | 'EXIT' | 'OVERTIME';
export type AttendanceStatus =
  | 'PENDING'
  | 'VALIDATED'
  | 'SYNCED'
  | 'CORRECTED'
  | 'CANCELLED'
  | 'REJECTED';

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName?: string;
  type: AttendanceType;
  status: AttendanceStatus;
  timestamp: string; // ISO UTC
  clientTimestamp?: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  locationId?: string;
  locationName?: string;
  inGeofence: boolean;
  geofenceDistanceMeters?: number;
  faceValidated: boolean;
  faceConfidence?: number;
  faceLivenessPassed: boolean;
  deviceId?: string;
  source: 'ONLINE' | 'OFFLINE_SYNC';
  clientEventId?: string;
}

export interface RegisterAttendanceRequest {
  type: AttendanceType;
  latitude: number;
  longitude: number;
  accuracy: number;
  faceToken: string;        // result token from face provider
  faceConfidence: number;
  livenessPassed: boolean;
  deviceId: string;
  clientTimestamp: string;
  clientEventId: string;     // idempotency
}

export interface RegisterAttendanceResponse {
  record: AttendanceRecord;
  nextExpectedType?: AttendanceType;
  message: string;
}

export type CorrectionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface AttendanceCorrection {
  id: string;
  employeeId: string;
  employeeName?: string;
  date: string;
  type: AttendanceType;
  requestedTime: string;
  reason: string;
  status: CorrectionStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  createdAt: string;
}

export interface CreateCorrectionRequest {
  date: string;
  type: AttendanceType;
  requestedTime: string;
  reason: string;
}
