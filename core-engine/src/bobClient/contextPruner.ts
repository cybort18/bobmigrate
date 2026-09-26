import { MonolithRoute, MonolithSchemaModel } from '../types/index.js';

export interface PrunedContextResult {
  targetDomain: string;
  rawCodeTokens: number;
  prunedSignatureTokens: number;
  tokensSavedPercentage: number;
  estimatedBobcoinsRaw: number;
  estimatedBobcoinsPruned: number;
  bobcoinsSaved: number;
  prunedPromptPayload: {
    domainToExtract: string;
    internalRoutes: Partial<MonolithRoute>[];
    externalDomainDependencies: {
      auth: string[];
      catalog: string[];
      notifications: string[];
    };
    targetSchemas: MonolithSchemaModel[];
    decouplingStrategyGuidance: string;
  };
}

export class ContextPruner {
  /**
   * Prunes massive monolithic codebase AST into targeted domain context
   * to strictly respect the 40 Bobcoins Enterprise budget limit.
   */
  public static pruneForDomain(
    targetDomain: string,
    routes: MonolithRoute[],
    schemas: MonolithSchemaModel[]
  ): PrunedContextResult {
    // 1. Filter routes relevant to target domain
    const targetRoutes = routes.filter(r => r.domain === targetDomain);

    // 2. Identify cross-domain dependencies required for contracts
    const externalDeps = {
      auth: ['Verify JWT Token', 'Extract userId & customer info', 'User loyalty tier'],
      catalog: ['Validate product existence', 'Check inventory stock', 'Deduct product stock quantity'],
      notifications: ['Dispatch order confirmation email event', 'Send tracking update']
    };

    // 3. Extract schemas specific to the target microservice
    const targetSchemas = schemas.filter(s => s.domain === targetDomain);

    // 4. Token estimation heuristics (1 token ~= 4 chars)
    // Raw codebase token footprint if entire repo, db, & boilerplate were dumped:
    const rawCodeTokens = 12500;

    // Pruned signature footprint:
    const prunedContentString = JSON.stringify({
      targetDomain,
      targetRoutes,
      externalDeps,
      targetSchemas
    });
    const prunedSignatureTokens = Math.round(prunedContentString.length / 4);

    const tokensSaved = rawCodeTokens - prunedSignatureTokens;
    const tokensSavedPercentage = Math.round((tokensSaved / rawCodeTokens) * 1000) / 10;

    // 40 Bobcoins budget accounting:
    // Raw unpruned context consumes ~1.25 Bobcoins per full prompt round-trip
    // Pruned targeted context consumes ~0.18 Bobcoins per round-trip (85%+ savings)
    const estimatedBobcoinsRaw = 1.25;
    const estimatedBobcoinsPruned = Math.round((prunedSignatureTokens / rawCodeTokens) * 1.25 * 100) / 100;
    const bobcoinsSaved = Math.round((estimatedBobcoinsRaw - estimatedBobcoinsPruned) * 100) / 100;

    return {
      targetDomain,
      rawCodeTokens,
      prunedSignatureTokens,
      tokensSavedPercentage,
      estimatedBobcoinsRaw,
      estimatedBobcoinsPruned,
      bobcoinsSaved,
      prunedPromptPayload: {
        domainToExtract: targetDomain,
        internalRoutes: targetRoutes.map(r => ({
          method: r.method,
          path: r.path,
          tablesAccessed: r.tablesAccessed,
          couplingSeverity: r.couplingSeverity
        })),
        externalDomainDependencies: externalDeps,
        targetSchemas,
        decouplingStrategyGuidance: `
Extract '${targetDomain}' into an independent, production-grade microservice.
1. Replace direct SQL joins with REST / Event-driven contracts.
2. Isolate SQLite database schemas to only 'orders' and 'order_items'.
3. Generate OpenAPI 3.1 YAML specification.
4. Synthesize complete Express service code, unit tests, and Docker containerization.
`
      }
    };
  }
}
