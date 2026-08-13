# 08 — Comparativa AWS vs Azure vs GCP

## Objetivo

Esta página debe evolucionar durante la implementación. No rellenarla únicamente con conocimiento
teórico antes de usar los servicios; registrar diferencias confirmadas mediante documentación y
hands-on.

## Baseline de capabilities

| Capability          | AWS                        | Azure                | GCP                        |
| ------------------- | -------------------------- | -------------------- | -------------------------- |
| API                 | API Gateway                | API Management       | API Gateway                |
| Function compute    | Lambda                     | Azure Functions      | Cloud Run functions        |
| NoSQL               | DynamoDB                   | Cosmos DB            | Firestore                  |
| Object storage      | S3                         | Blob Storage         | Cloud Storage              |
| Async messaging     | SQS                        | Service Bus Queue    | Pub/Sub                    |
| Event routing       | EventBridge                | Event Grid           | Eventarc                   |
| Workload identity   | IAM Role                   | Managed Identity     | Service Account            |
| Authorization model | IAM policies               | Azure RBAC           | Cloud IAM                  |
| Secrets             | Secrets Manager            | Key Vault            | Secret Manager             |
| Logs/metrics        | CloudWatch                 | Azure Monitor        | Cloud Logging / Monitoring |
| Tracing             | X-Ray / CloudWatch tracing | Application Insights | Cloud Trace                |
| Managed containers  | ECS Fargate                | Container Apps       | Cloud Run                  |
| IaC provider        | AWS                        | AzureRM              | Google                     |

## Hallazgos AWS — M1 (hands-on, no teóricos)

Registrado durante la implementación real (`specs/002-aws-reference-implementation/`), no antes.
Azure/GCP se completarán en M2/M3 siguiendo la misma disciplina.

### Identity

Cada una de las 7 Lambda tiene su propio IAM role + policy inline, scoped exactamente a lo que esa
función llama (ADR-009). No hay credenciales estáticas en ningún adapter (verificado por grep,
SC-006). Gotcha real: presignar un upload S3 delega la autorización real al role que firma — sin
`s3:PutObject` en ese role, S3 rechaza la URL firmada cuando el cliente intenta subir. El diseño
inicial (`data-model.md`) asumió erróneamente que presignar no requería IAM propio; se corrigió
durante la implementación (ver nota en `data-model.md`).

### Messaging

SQS Standard (ADR-004), no FIFO — la idempotency ya vive en la capa de aplicación (M0 ADR-001), no
en deduplicación de SQS. Partial batch failure reporting
(`function_response_types = ["ReportBatchItemFailures"]`) fue necesario para que un mensaje fallido
no descarte los demás mensajes exitosos del mismo batch — fácil de omitir, y sin él el worker
reintentaría mensajes que ya habían tenido éxito.

### Events

EventBridge con bus custom, no el default (ADR-008). Gotcha estructural: la rule + targets de
EventBridge necesitan los ARNs de los Lambda destino, que se crean en `compute`, no en `events` —
crear la rule dentro de `events` habría generado un ciclo de dependencia entre módulos Terraform.
Se resolvió moviendo rule+targets al módulo `compute`.

### NoSQL

DynamoDB single-table, partition key `applicationId`, un GSI (`idempotencyKey-index`) para el
lookup por Idempotency-Key (ADR-006). Conditional writes (`attribute_not_exists` en creación,
`version = :expectedVersion` en transiciones — ADR-007) cierran una race condition que el patrón de
idempotency puramente in-memory de M0 no podía cerrar por sí solo.

### Object Storage

S3 privado, `PutObject` presigned URL (`@aws-sdk/s3-request-presigner`), expiry configurable
(15 min por defecto). Ver el gotcha de Identity arriba — la firma no es solo criptografía, requiere
permiso IAM real detrás.

### Serverless compute

7 funciones Lambda (`nodejs20.x`), una por responsabilidad (ADR-005). Empaquetado real: un `tsc`
build simple deja `node_modules` sin empaquetar y no es desplegable — se optó por bundlear cada
handler con esbuild (`scripts/build-lambda.mjs`) en un único archivo CJS con tree-shaking, en vez
de copiar `node_modules` completo o depender de la versión del AWS SDK que trae el runtime.

### Observability

CloudWatch Logs Insights permite correlacionar `correlationId` a través de varios log groups en una
sola query (ver runbook en `docs/architecture/03-aws.md`). Un log group + retención explícita por
Lambda evita el default de "nunca expira" cuando AWS los crea automáticamente en el primer invoke.

### Terraform

8 módulos (`database`, `storage`, `messaging`, `events`, `identity`, `compute`, `api`,
`observability`), ~45 resources en total. `terraform validate` pasó limpio en el primer intento tras
diseñar cuidadosamente el grafo de dependencias entre módulos (base resources → `identity` →
`compute` → `api`/`observability`). Costo/fricción principal esperada en un lab real: nombres de S3
bucket global-únicos (resuelto con `data.aws_caller_identity` en vez del provider `random`).

## Plantilla de análisis por capability

Para cada capability documentar:

### AWS

- servicio/configuración usada;
- modelo mental;
- decisiones;
- gotchas encontrados.

### Azure

- servicio/configuración usada;
- diferencias con AWS;
- gotchas encontrados.

### GCP

- servicio/configuración usada;
- diferencias con AWS/Azure;
- gotchas encontrados.

### Comparación

- similarities;
- important differences;
- trade-offs;
- operational experience;
- Terraform experience;
- cost implications;
- qué sorprendió.

## Preguntas de comparación prioritarias

### Identity

- ¿Cómo obtiene una Function identidad sin credenciales estáticas?
- ¿Dónde se adjunta esa identidad?
- ¿Cómo se autorizan acciones sobre otro recurso?
- ¿Cuál es el scope de una policy/role assignment/binding?

### Messaging

- ¿Queue vs topic/subscription?
- ¿Cómo se hace ack/settlement?
- ¿Cómo funciona retry?
- ¿Cómo llega a DLQ?
- ¿Qué ordering guarantees existen?
- ¿Cómo trata duplicados?

### Events

- ¿Qué problema resuelve el event router frente al broker?
- ¿Qué filtros ofrece?
- ¿Cómo hace fan-out?
- ¿Qué retry/dead-letter behavior tiene?

### NoSQL

- partitioning model;
- consistency;
- indexes;
- conditional writes / concurrency;
- transactions disponibles;
- throughput/pricing model.

### Object Storage

- signed upload mechanism;
- identity requerida para firmar;
- private-by-default behavior;
- lifecycle/versioning.

### Serverless compute

- runtime/hosting model;
- concurrency;
- timeout;
- event integrations;
- deployment unit;
- cold starts;
- scaling controls.

### Observability

- cómo buscar logs;
- correlation/search query experience;
- native traces;
- alerting;
- integración entre servicios.

### Terraform

- cantidad de resources;
- verbosity;
- provider auth;
- create/destroy duration;
- hidden prerequisites;
- resources que generan fricción.

## Regla contra falsas equivalencias

Evitar frases como:

- "Pub/Sub es SQS de Google".
- "Managed Identity es exactamente IAM Role".
- "Cosmos DB es DynamoDB de Azure".

Preferir:

> "En esta arquitectura cumplen una capability comparable, pero difieren en X, Y y Z."

## Resultado final deseado

Esta página debe poder utilizarse como:

- fuente para un artículo técnico;
- base para una infografía comparativa;
- evidencia de reflexión arquitectónica posterior al hands-on.
