# IBM Bob 2.0 Task Session Consumption Evidence

This folder contains the official evidence of **IBM Bob 2.0 Agent Mode** task sessions and Bobcoins consumption, compliant with the hackathon submission deliverable requirements.

---

## 1. Verified Account & Provisioning Metadata

- **Registered User ID**: `zakyr9278@gmail.com`
- **Assigned Instance ID**: `20260320-1730-1190-51d7-2eb712f71838`
- **Assigned Team ID**: `01a0677e-83f7-7bbe-a64e-26a17074be8f` (`ibm-hackathon-lablab`)
- **Gateway Domain**: `api.us-east.bob.ibm.com`
- **Model Engine**: `IBM Granite 3.8B Instruct (granite-3-3-8b-instruct)`
- **Enterprise Budget Allocated**: `40.0 Bobcoins`
- **Bobcoins Consumed**: `~0.18 Bobcoins` per autonomous run
- **Token Pruning Efficiency**: **85.2% - 96% reduction** via AST Context Pruning

---

## 2. Task Session Screenshots Catalog

| File Name | Description | Key Evidence / Metrics |
| :--- | :--- | :--- |
| `bobmigrate_task01_ast_boundary_analysis.png` | **Task 01: Boundary Analysis** | Autonomous chain-of-thought streaming, AST schema pruning, identifying 4 coupled domains. |
| `bobmigrate_task02_openapi_spec_synthesis.png` | **Task 02: Contract Synthesis** | Dynamic generation of OpenAPI 3.1 YAML specifications with standardized schema definitions. |
| `bobmigrate_task03_service_code_generation.png` | **Task 03: Service Synthesizer** | Before vs. After code comparison: monolithic SQL joins converted to isolated SQLite models & Express handlers. |
| `bobmigrate_task04_live_contract_execution.png` | **Task 04: Contract Sandbox** | Live HTTP execution targeting backend (`POST /api/orders/checkout`) returning `201 Created` with live latency. |
| `bobmigrate_task05_architecture_topology_map.png` | **Task 05: Topology Visualizer** | Interactive architectural coupling graph: Monolith 38% High Coupling vs Decoupled 0% Isolated Services. |
| `bobmigrate_task06_docker_export_packaging.png` | **Task 06: Packaging & Export** | Standalone microservice export package with Jest test suites, Dockerfile, and docker-compose.yml. |
