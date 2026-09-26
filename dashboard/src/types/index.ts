export interface GraphNode {
  id: string;
  label: string;
  domain: 'auth' | 'catalog' | 'orders' | 'notifications';
  type: string;
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
  type: string;
  couplingSeverity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  animated?: boolean;
}

export interface MonolithRoute {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  domain: 'auth' | 'catalog' | 'orders' | 'notifications';
  crossDomainCalls: string[];
  tablesAccessed: string[];
  couplingSeverity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
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
    couplingScore: number;
  };
  routes: MonolithRoute[];
  schemas: any[];
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

export interface DecompositionResult {
  id: string;
  targetDomain: string;
  startedAt: string;
  completedAt: string;
  totalBobcoinsUsed: number;
  bobcoinsBudgetRemaining: number;
  steps: BobAgentReasoningStep[];
  artifacts: {
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
  };
  summary: {
    beforeMonolithCoupling: string;
    afterMicroserviceBenefits: string[];
    migrationRecommendation: string;
  };
}
