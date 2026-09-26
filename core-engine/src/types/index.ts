export interface MonolithRoute {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  domain: 'auth' | 'catalog' | 'orders' | 'notifications';
  handlerName?: string;
  crossDomainCalls: string[];
  tablesAccessed: string[];
  couplingSeverity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface MonolithSchemaModel {
  tableName: string;
  domain: 'auth' | 'catalog' | 'orders' | 'notifications';
  columns: { name: string; type: string; isPrimary?: boolean; isForeign?: boolean; references?: string }[];
  foreignKeys: { column: string; targetTable: string; targetColumn: string }[];
}

export interface GraphNode {
  id: string;
  label: string;
  domain: 'auth' | 'catalog' | 'orders' | 'notifications';
  type: 'monolith_core' | 'bounded_domain' | 'database_table' | 'external_service';
  routesCount: number;
  tables: string[];
  color: string;
  status: 'coupled' | 'decoupled' | 'isolated';
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  type: 'direct_sql_join' | 'sync_in_memory_call' | 'cross_table_mutation' | 'rest_contract' | 'event_bus';
  couplingSeverity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  animated?: boolean;
}

export interface MonolithAnalysisResult {
  applicationName: string;
  scannedAt: string;
  monolithStats: {
    totalFiles: number;
    totalLinesOfCode: number;
    totalRoutes: number;
    entangledQueriesCount: number;
    detectedDomains: string[];
    couplingScore: number; // 0 - 100%
  };
  routes: MonolithRoute[];
  schemas: MonolithSchemaModel[];
  graph: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
  pruningMetrics: {
    rawCodeTokens: number;
    prunedSignatureTokens: number;
    tokensSavedPercentage: number;
    estimatedBobcoinsRaw: number;
    estimatedBobcoinsPruned: number;
    bobcoinsSaved: number;
  };
}

export interface BobAgentReasoningStep {
  stepNumber: number;
  stepName: string;
  title: string;
  timestamp: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  details: string;
  thoughtProcess: string;
  artifactsProduced?: string[];
  bobcoinsConsumed: number;
}

export interface GeneratedArtifacts {
  openApiYaml: string;
  microserviceFiles: {
    filePath: string;
    description: string;
    code: string;
    language: string;
  }[];
  unitTestsCode: string;
  dockerfile: string;
  dockerComposeYaml: string;
  readmeMarkdown: string;
}

export interface DecompositionResult {
  id: string;
  targetDomain: string;
  startedAt: string;
  completedAt: string;
  totalBobcoinsUsed: number;
  bobcoinsBudgetRemaining: number;
  steps: BobAgentReasoningStep[];
  artifacts: GeneratedArtifacts;
  summary: {
    beforeMonolithCoupling: string;
    afterMicroserviceBenefits: string[];
    migrationRecommendation: string;
  };
}
