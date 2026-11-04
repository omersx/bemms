/**
 * BEMMS AI Knowledge Service — Types
 *
 * Defines the read-model shape returned by the knowledge service.
 * Every result includes source identifiers and links back to BEMMS records.
 * No sensitive fields (passwords, contact details, internal comments) are returned.
 */

// ── Historical Case — the primary knowledge retrieval result ──────────────────

export type HistoricalMaintenanceCase = {
  source: {
    maintenanceRecordId: string;
    maintenanceRecordNumber: string;
    maintenanceTaskId: string;
    maintenanceTaskNumber: string;
    ticketId?: string;
    ticketNumber?: string;
    sourceUrl: string;
    finalizedAt?: string;
  };
  device: {
    id: string;
    name: string;
    internalCode: string;
    assetNumber: string;
    manufacturer?: string;
    model?: string;
    modelNumber?: string;
    category?: string;
    criticality?: string;
    riskClassification?: string;
  };
  report?: {
    title?: string;
    description?: string;
    reportedProblemCategory?: string;
    reportedImpact?: string;
  };
  engineering: {
    maintenanceType: string;
    technicalCategory?: string;
    diagnosis?: string;
    rootCause?: string;
    findings?: string;
    workPerformed?: string;
    recommendations?: string;
  };
  verification: {
    checklistResults: ChecklistResultSummary[];
    finalResult: string;
    finalDeviceStatus: string;
  };
  parts: PartSummary[];
  quality: {
    state: 'historical_finalized';
    limitations: string[];
  };
};

export type ChecklistResultSummary = {
  label: string;
  result?: string;
  measuredValue?: string;
  unit?: string;
  notes?: string;
};

export type PartSummary = {
  partNumber: string;
  partName: string;
  quantity: number;
};

// ── Search parameters ─────────────────────────────────────────────────────────

export type KnowledgeSearchContext = {
  currentDeviceId?: string;
  currentTicketId?: string;
  currentMaintenanceTaskId?: string;
};

export type KnowledgeSearchQuery = {
  text?: string;
  manufacturerId?: string;
  modelId?: string;
  deviceCategoryId?: string;
  technicalCategory?: string;
  maintenanceType?: string;
  limit?: number;
};

export type KnowledgeSearchParams = {
  context: KnowledgeSearchContext;
  query: KnowledgeSearchQuery;
};

// ── Search result ─────────────────────────────────────────────────────────────

export type KnowledgeSearchResult = {
  cases: HistoricalMaintenanceCase[];
  totalMatched: number;
  searchedAt: string;
};
