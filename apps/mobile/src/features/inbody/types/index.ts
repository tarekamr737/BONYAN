export type InBodyScanStatus =
  | "uploaded"
  | "processing"
  | "review_required"
  | "confirmed"
  | "failed"
  | "deleted";

export type InBodyMetricKey =
  | "height"
  | "weight"
  | "skeletal_muscle_mass"
  | "body_fat_mass"
  | "body_fat_percentage"
  | "bmi"
  | "total_body_water"
  | "visceral_fat_level"
  | "inbody_score";

export type MeasurementMetadata = {
  confidence?: number | null;
  flags: string[];
  user_edited: boolean;
};

export type InBodyMeasurement = {
  key: InBodyMetricKey;
  value: number | null;
  unit: string | null;
  metadata: MeasurementMetadata;
};

export type InBodyResult = {
  scan_date: string | null;
  measurements: InBodyMeasurement[];
  review_flags: string[];
};

export type InBodyScan = {
  id: string;
  status: InBodyScanStatus;
  filename: string;
  content_type: string;
  created_at: string;
  updated_at: string;
  confirmed_at: string | null;
  failure_code: string | null;
  failure_message: string | null;
  result: InBodyResult | null;
};

export type InBodyHistoryResponse = {
  scans: InBodyScan[];
};

export type UploadResponse = {
  scan: InBodyScan;
  duplicate: boolean;
};
