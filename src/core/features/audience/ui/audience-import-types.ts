export type ImportConsent = {
  brandOrLegalSender: string;
  messageCategory: string;
  frequencyDisclosure: string;
  destinationJurisdiction: string;
  consentText: string;
  consentVersion: string;
};

export type ImportPreset = {
  id: string;
  label: string;
  status: string;
  description: string;
};

export type ImportField = {
  id: string;
  label: string;
};

export type ImportPresetsResponse = {
  presets: ImportPreset[];
  fields: ImportField[];
};

export type ImportPreview = {
  fingerprint: string;
  counts: {
    created: number;
    updated: number;
    rejected: number;
    unsubscribed: number;
    suppressed: number;
    input?: number;
    unique?: number;
    duplicates?: number;
    unmapped?: number;
    effects?: number;
    byKind?: Record<string, number>;
  };
  columns: Array<{ name: string; headers: string[]; mapping: Record<string, string> }>;
  rows: Array<{
    file: string;
    row: number;
    email: string;
    displayName: string;
    status: string;
    reason?: string;
    warnings: string[];
  }>;
  warnings: string[];
};

export type ImportJob = {
  id: string;
  state: 'queued' | 'applying' | 'completed' | 'failed' | 'undoing' | 'undone' | 'rolling_back' | 'rolled_back';
  checkpoint: number;
  total: number;
  error: string | null;
  abandonedAt?: number;
  abandonedBy?: string | null;
  rolledBack?: number;
  kept?: number;
};

export type ImportApiError = {
  error?: string;
  detail?: string;
};
