# 03 — Arquitectura AWS — Reference Implementation

## Rol de AWS en el proyecto

AWS es la **reference implementation**. Aquí se permite mayor profundidad porque es la nube base
desde la cual se traducirán las capabilities hacia Azure y GCP.

La meta no es llenar la solución de servicios AWS. Debe conservarse el mismo problema y arquitectura
lógica que las otras nubes.

## Stack objetivo V1

- Amazon API Gateway
- AWS Lambda
- Amazon DynamoDB
- Amazon S3
- Amazon SQS
- SQS Dead-Letter Queue
- Amazon EventBridge
- AWS IAM roles/policies
- AWS Secrets Manager
- Amazon CloudWatch Logs/Metrics/Alarms
- AWS X-Ray o tracing complementario si no retrasa el core
- Terraform

## Flujo AWS

```
Client
  ↓
API Gateway
  ↓
Lambda API
  ├── DynamoDB
  ├── S3 Presigned URL
  └── SQS Evaluation Queue
          ↓
      Lambda Worker
          ├── DynamoDB
          └── EventBridge
                 ├── Audit Lambda
                 └── Notification Lambda
```

## Aspectos específicos a estudiar

### API Gateway

- HTTP API vs REST API: elegir conscientemente y documentar decisión.
- routes/integrations;
- throttling si aplica;
- logs relevantes;
- payload/error mapping solo donde aporte valor.

### Lambda

- execution role;
- timeout/memory;
- environment variables;
- concurrency solo si hay razón;
- SDK usage;
- structured logging;
- deployment packaging.

### DynamoDB

- partition key propuesta;
- access patterns antes del diseño;
- conditional writes para idempotency/concurrency;
- consistency de reads cuando sea relevante;
- TTL solo si existe un caso real;
- evitar scans como diseño principal.

### S3

- bucket privado;
- presigned upload;
- object key convention;
- lifecycle rules solo si ayudan a costo/limpieza;
- bloquear public access.

### SQS

- Standard vs FIFO: no asumir FIFO automáticamente.
- visibility timeout;
- redrive policy;
- DLQ;
- maxReceiveCount;
- duplicate delivery awareness.

### EventBridge

- custom event bus o default bus: justificar.
- event patterns;
- targets;
- diferencia respecto a SQS/SNS.

### IAM

Aplicar least privilege razonable:

- API Lambda solo acceso requerido.
- Worker consume queue y actualiza datastore.
- Event consumers solo permisos necesarios.

No usar credenciales estáticas dentro de Functions.

### Secrets Manager

Crear al menos un secret ficticio solo para practicar retrieval e IAM. Ejemplo:
`RISK_ENGINE_API_KEY` de test.

### CloudWatch

Debe ser posible encontrar:

- request/application logs;
- worker failures;
- queue depth/retries;
- DLQ condition;
- custom/business metric opcional.

Crear al menos una alarma relacionada con failure/backlog/DLQ.

## Terraform AWS

Organización sugerida:

```
infra/aws/
├── main.tf
├── variables.tf
├── outputs.tf
├── providers.tf
├── versions.tf
└── modules/
    ├── api/
    ├── compute/
    ├── database/
    ├── storage/
    ├── messaging/
    ├── events/
    ├── identity/
    └── observability/
```

No modularizar cada recurso trivial. Los módulos deben representar responsabilidades/capabilities
útiles.

## Definition of Done AWS V1

- Terraform crea todos los recursos core.
- API expone contract acordado.
- Upload firmado funciona.
- Submit genera trabajo asíncrono.
- Worker actualiza estado.
- EventBridge distribuye evento.
- Failure repetido termina en DLQ.
- Logs permiten seguir una solicitud por correlation ID.
- Alarma relevante existe.
- E2E suite pasa.
- `terraform destroy` elimina recursos gestionados por la PoC.

## Preguntas de estudio

- ¿Cuándo SQS FIFO sería necesario y qué costo/limitaciones introduce?
- ¿Cómo afectan los retries de Lambda + SQS al procesamiento?
- ¿Qué consistency guarantees necesita cada access pattern de DynamoDB?
- ¿Dónde conviene una conditional write?
- ¿Cómo se propaga correlation ID entre API, queue y EventBridge?
- ¿Qué permisos exactos requiere cada workload?
- ¿Qué recursos no desaparecen automáticamente y por qué?

## Operational runbook (User Story 2, M1)

Respuestas concretas a las preguntas de `docs/07-testing-failure-observability.md`, específicas de
esta implementación AWS (ver `specs/002-aws-reference-implementation/`).

1. **¿Dónde empiezo ante una solicitud fallida?** CloudWatch Logs → log group del Lambda
   API-facing correspondiente (`/aws/lambda/<name_prefix>-api-create`, `-api-submit`, etc.). Cada
   línea es JSON estructurado (`src/adapters/aws/logger.ts`) con `correlationId`, `applicationId`,
   `component`, `operation`.
2. **¿Cómo busco por correlation ID?** CloudWatch Logs Insights sobre el log group relevante (o
   varios a la vez):
   `fields @timestamp, level, message, correlationId, applicationId, component | filter correlationId = "<id>"`.
   Como el `correlationId` es el mismo en `api-submit`, `worker-evaluate`, `event-audit` y
   `event-notification` (FR-010/FR-007), una sola query cruzando los log groups de esos cuatro
   Lambdas reconstruye la operación completa.
3. **¿Cómo encuentro el worker invocation?** Log group
   `/aws/lambda/<name_prefix>-worker-evaluate`, filtrado por `correlationId` o `applicationId`.
4. **¿Cómo veo retries?** SQS console → cola `<name_prefix>-evaluation-queue` → métrica
   `ApproximateReceiveCount` del mensaje, o simplemente contar cuántas veces aparece el mismo
   `correlationId` en el log group de `worker-evaluate` (cada `ERROR` sin éxito subsecuente es un
   intento).
5. **¿Dónde está la DLQ?** Cola `<name_prefix>-evaluation-queue-dlq` (output Terraform
   `sqs_dlq_url`). Un mensaje llega ahí tras `maxReceiveCount` (`var.sqs_max_receive_count`,
   default 3) intentos fallidos.
6. **¿Cómo inspecciono el mensaje?** SQS console → "Send and receive messages" sobre la DLQ, o
   `aws sqs receive-message --queue-url <dlq_url>`. El body es el `EvaluateApplication` JSON
   (`messageId`, `applicationId`, `correlationId`) — de ahí se retoma la búsqueda por
   `correlationId` en los logs.
7. **¿Cómo identifico un permission error?** El Lambda que falló loguea un `ERROR` con
   `errorType`/`errorMessage` (via `logger.error`, que captura cualquier excepción del AWS SDK,
   incluyendo `AccessDeniedException`). El mensaje de esa excepción nombra la acción/recurso
   denegado — comparar contra la policy scoped de ese Lambda en
   `infra/aws/modules/identity/main.tf` (una policy por Lambda, ver
   `specs/002-aws-reference-implementation/data-model.md`'s tabla de IAM).
8. **¿Qué métrica confirma el problema?** Alarma CloudWatch
   `<name_prefix>-evaluation-dlq-depth` (`infra/aws/modules/observability/main.tf`) — pasa a
   `ALARM` en cuanto `ApproximateNumberOfMessagesVisible` de la DLQ es mayor a 0.
