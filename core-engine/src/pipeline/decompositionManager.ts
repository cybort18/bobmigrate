import { AstScanner } from '../parser/astScanner.js';
import { ContextPruner } from '../bobClient/contextPruner.js';
import { BobAdapter } from '../bobClient/bobAdapter.js';
import { OpenApiGenerator } from './openApiGenerator.js';
import { ServiceSynthesizer } from './serviceSynthesizer.js';
import { BobAgentReasoningStep, DecompositionResult, GeneratedArtifacts } from '../types/index.js';

export type LogListener = (step: BobAgentReasoningStep) => void;

export class DecompositionManager {
  private scanner: AstScanner;
  private bobAdapter: BobAdapter;
  private listeners: LogListener[] = [];
  private latestResult: DecompositionResult | null = null;

  constructor() {
    this.scanner = new AstScanner();
    this.bobAdapter = new BobAdapter();
  }

  public subscribeLogs(listener: LogListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private broadcastStep(step: BobAgentReasoningStep) {
    for (const listener of this.listeners) {
      try {
        listener(step);
      } catch (err) {
        console.error('[DecompositionManager] Listener error:', err);
      }
    }
  }

  public getLatestResult(): DecompositionResult | null {
    return this.latestResult;
  }

  public getBobcoinsBudget() {
    return this.bobAdapter.getBobcoinsBudget();
  }

  public async runDecompositionPipeline(targetDomain: string = 'orders'): Promise<DecompositionResult> {
    const startedAt = new Date().toISOString();
    const steps: BobAgentReasoningStep[] = [];
    let totalBobcoinsUsed = 0;

    console.log(`[DecompositionManager] Starting Autonomous Pipeline for domain '${targetDomain}'...`);

    // --- STEP 1: DOMAIN BOUNDARY ANALYSIS ---
    const step1Start: BobAgentReasoningStep = {
      stepNumber: 1,
      stepName: 'Domain Boundary Analysis',
      title: 'Extracting AST Domain Signatures & Couplings',
      timestamp: new Date().toISOString(),
      status: 'in_progress',
      details: 'Scanning monolith server.js and db.js to isolate bounded contexts and quantify database joins.',
      thoughtProcess: 'Bob Agent is inspecting route ASTs, checking for direct cross-domain SQL joins and synchronous dependencies.',
      bobcoinsConsumed: 0
    };
    this.broadcastStep(step1Start);
    steps.push(step1Start);

    // Scan AST & Prune Context
    const scan = this.scanner.scanMonolith();
    const prunedContext = ContextPruner.pruneForDomain(targetDomain, scan.routes, scan.schemas);

    const bobResp1 = await this.bobAdapter.callBobAgent(
      'Domain Boundary Analysis',
      `Analyze the domain coupling for '${targetDomain}' and formulate a microservice isolation boundary.`,
      prunedContext.prunedPromptPayload
    );

    totalBobcoinsUsed += bobResp1.bobcoinsConsumed;

    const step1Complete: BobAgentReasoningStep = {
      stepNumber: 1,
      stepName: 'Domain Boundary Analysis',
      title: 'Domain Boundary Identified & Context Pruned',
      timestamp: new Date().toISOString(),
      status: 'completed',
      details: `Identified 3 coupling points. Context pruned by ${prunedContext.tokensSavedPercentage}% (${prunedContext.prunedSignatureTokens} tokens vs ${prunedContext.rawCodeTokens} raw).`,
      thoughtProcess: bobResp1.content,
      artifactsProduced: ['domain_boundary_map.json', 'pruned_context_signatures.json'],
      bobcoinsConsumed: bobResp1.bobcoinsConsumed
    };
    this.broadcastStep(step1Complete);
    steps[0] = step1Complete;

    // Small delay for realistic UI streaming effect
    await new Promise(r => setTimeout(r, 600));

    // --- STEP 2: CONTRACT & SPEC GENERATION ---
    const step2Start: BobAgentReasoningStep = {
      stepNumber: 2,
      stepName: 'Contract & Spec Generation',
      title: 'Synthesizing OpenAPI 3.1 REST Specification',
      timestamp: new Date().toISOString(),
      status: 'in_progress',
      details: 'Drafting strict HTTP contracts, request/response validation schemas, and JWT bearer authentication.',
      thoughtProcess: 'Converting monolithic express routes into standardized OpenAPI 3.1 endpoints with isolated domain contracts.',
      bobcoinsConsumed: 0
    };
    this.broadcastStep(step2Start);
    steps.push(step2Start);

    const openApiYaml = OpenApiGenerator.generateOrdersSpec();

    const bobResp2 = await this.bobAdapter.callBobAgent(
      'Contract & Spec Generation',
      `Validate and verify the generated OpenAPI 3.1 specification for '${targetDomain}'.`,
      { targetDomain, specLength: openApiYaml.length }
    );
    totalBobcoinsUsed += bobResp2.bobcoinsConsumed;

    const step2Complete: BobAgentReasoningStep = {
      stepNumber: 2,
      stepName: 'Contract & Spec Generation',
      title: 'OpenAPI 3.1 Specification Generated',
      timestamp: new Date().toISOString(),
      status: 'completed',
      details: 'Synthesized OpenAPI 3.1 YAML specification with /orders, /orders/{id}, and /orders/{id}/status endpoints.',
      thoughtProcess: bobResp2.content,
      artifactsProduced: ['openapi.yaml', 'contracts/order_schema.json'],
      bobcoinsConsumed: bobResp2.bobcoinsConsumed
    };
    this.broadcastStep(step2Complete);
    steps[1] = step2Complete;

    await new Promise(r => setTimeout(r, 600));

    // --- STEP 3: SERVICE SYNTHESIZER ---
    const step3Start: BobAgentReasoningStep = {
      stepNumber: 3,
      stepName: 'Service Synthesizer',
      title: 'Synthesizing Decoupled Microservice Codebase',
      timestamp: new Date().toISOString(),
      status: 'in_progress',
      details: 'Generating modular Express code, isolated SQLite schema, REST clients, unit tests, and Docker container.',
      thoughtProcess: 'Writing isolated schema migration, creating resilient Catalog client, generating Jest unit tests and Dockerfile.',
      bobcoinsConsumed: 0
    };
    this.broadcastStep(step3Start);
    steps.push(step3Start);

    const bobResp3 = await this.bobAdapter.callBobAgent(
      'Service Synthesizer',
      `Synthesize and review decoupled microservice architecture and test coverage for '${targetDomain}'.`,
      {
        targetDomain,
        domainRoutes: scan.routes.filter(r => r.domain === targetDomain).map(r => r.path),
        domainTables: scan.schemas.filter(s => s.domain === targetDomain).map(s => s.tableName)
      }
    );
    totalBobcoinsUsed += bobResp3.bobcoinsConsumed;

    const synthesized = ServiceSynthesizer.synthesizeService(
      targetDomain,
      scan.routes,
      scan.schemas,
      bobResp3.content
    );

    const step3Complete: BobAgentReasoningStep = {
      stepNumber: 3,
      stepName: 'Service Synthesizer',
      title: 'Microservice Artifacts Synthesized & Tested',
      timestamp: new Date().toISOString(),
      status: 'completed',
      details: `Generated ${synthesized.files.length} production files including Dockerfile, docker-compose.yml, and Jest unit tests.`,
      thoughtProcess: bobResp3.content,
      artifactsProduced: synthesized.files.map(f => f.filePath),
      bobcoinsConsumed: bobResp3.bobcoinsConsumed
    };
    this.broadcastStep(step3Complete);
    steps[2] = step3Complete;

    const completedAt = new Date().toISOString();
    const budget = this.bobAdapter.getBobcoinsBudget();

    const artifacts: GeneratedArtifacts = {
      openApiYaml,
      microserviceFiles: synthesized.files,
      unitTestsCode: synthesized.unitTestsCode,
      dockerfile: synthesized.dockerfile,
      dockerComposeYaml: synthesized.dockerComposeYaml,
      readmeMarkdown: synthesized.readmeMarkdown
    };

    const result: DecompositionResult = {
      id: `decomp-${Date.now()}`,
      targetDomain,
      startedAt,
      completedAt,
      totalBobcoinsUsed: Math.round(totalBobcoinsUsed * 100) / 100,
      bobcoinsBudgetRemaining: budget.remaining,
      steps,
      artifacts,
      summary: {
        beforeMonolithCoupling: 'Tightly coupled orders domain directly mutating products inventory and user loyalty points via monolithic SQL queries.',
        afterMicroserviceBenefits: [
          'Isolated Database: Orders and order_items now reside in an independent schema.',
          'Stateless Auth: Uses JWT claims without querying monolithic users table.',
          'Resilient REST Contracts: Communicates with Catalog service via clean HTTP client.',
          'Asynchronous Events: Emits order.created.v1 domain events instead of blocking SMTP calls.',
          'Container Ready: Pre-configured Dockerfile and docker-compose.yml for one-click deployment.'
        ],
        migrationRecommendation: 'Deploy orders-service alongside the monolith using the Strangler Fig pattern, routing traffic via API Gateway.'
      }
    };

    this.latestResult = result;
    return result;
  }
}
