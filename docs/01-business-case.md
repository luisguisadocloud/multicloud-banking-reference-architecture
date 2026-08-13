# 01 — Caso de negocio: Digital Credit Application

## Contexto

Banco ficticio que ofrece un proceso digital para solicitar una línea o producto crediticio. El
sistema recibe la solicitud, almacena documentación ficticia, inicia evaluación asíncrona y publica
el resultado.

El dominio está diseñado para ser suficientemente bancario para el portfolio, pero deliberadamente
simple para que la complejidad principal esté en la arquitectura cloud.

## Actor principal

**Applicant / Customer**: usuario ficticio que inicia una solicitud. No se requiere modelar un
sistema completo de Customer Master Data.

## Flujo principal

1. Cliente crea una solicitud.
2. Sistema devuelve `applicationId`.
3. Cliente solicita autorización temporal de upload.
4. Cliente carga un documento directamente al Object Storage.
5. Cliente envía la solicitud.
6. Backend valida que sea enviable.
7. Solicitud cambia a `SUBMITTED` / `EVALUATING`.
8. Se publica trabajo de evaluación en una queue.
9. Evaluation Worker procesa el mensaje.
10. Se calcula un resultado ficticio.
11. Se actualiza la solicitud.
12. Se publica `ApplicationEvaluated`.
13. Consumidores de auditoría/notificación reaccionan al evento.
14. Cliente consulta el estado final.

## State machine de negocio

`DRAFT → SUBMITTED → EVALUATING → APPROVED | REJECTED | MANUAL_REVIEW`

Reglas básicas:

- Solo una solicitud `DRAFT` puede modificarse.
- Una solicitud enviada no debe volver a `DRAFT`.
- Una evaluación repetida no debe producir efectos duplicados.
- El resultado se obtiene asíncronamente.

## API V1

### POST /applications

Crea una solicitud.

Headers relevantes:

- `Idempotency-Key`
- `X-Correlation-Id` opcional; generar uno si no existe.

Response principal:

- `applicationId`
- `status=DRAFT`

### POST /applications/{id}/documents

No envía necesariamente el binario por el API. Devuelve información para upload directo temporal.

Implementaciones objetivo:

- AWS S3 presigned URL.
- Azure Blob SAS.
- GCP Signed URL.

### POST /applications/{id}/submit

Valida la solicitud y encola la evaluación. Debe protegerse frente a reintentos para que múltiples
submits no generen múltiples evaluaciones efectivas.

### GET /applications/{id}

Obtiene estado y resultado cuando exista.

### GET /applications/{id}/events — opcional

Puede agregarse si aporta valor al laboratorio de auditoría; no es requisito del core.

## Modelo conceptual

### CreditApplication

Campos sugeridos:

- `applicationId`
- `customerReference`
- `requestedAmount`
- `status`
- `documentReferences[]`
- `riskScore` opcional
- `decision` opcional
- `createdAt`
- `updatedAt`
- `version` opcional para optimistic concurrency

### DocumentReference

- `documentId`
- `applicationId`
- `type`
- `objectKey`
- `uploadedAt`

### ApplicationEvent

- `eventId`
- `eventType`
- `applicationId`
- `correlationId`
- `timestamp`
- payload mínimo requerido por consumidores

## Command / work message

`EvaluateApplication`

Campos mínimos:

- `messageId`
- `applicationId`
- `correlationId`
- `attempt/context` solo si la plataforma lo requiere; no inventar retry count dentro del mensaje si
  el broker ya lo gestiona.

## Domain event

`ApplicationEvaluated`

Campos sugeridos:

- `eventId`
- `eventType`
- `applicationId`
- `correlationId`
- `result`
- `timestamp`

## Motor de decisión V1

Debe ser determinista y explícitamente ficticio.

Ejemplo conceptual:

- ciertos rangos de `requestedAmount` producen `APPROVED`;
- otros `MANUAL_REVIEW`;
- un flag de test produce `REJECTED` o fuerza error.

No presentar esta lógica como modelo crediticio real.

## Datos de prueba

Usar identificadores como:

- `CUSTOMER-001`
- `APP-001`
- nombres/documentos sintéticos.

Para failure engineering puede existir un campo o fixture especial como `FORCE_FAILURE`; mantenerlo
claramente dentro de test fixtures y no contaminar el dominio productivo.

## Requisitos no funcionales relevantes

- Idempotency.
- At-least-once delivery awareness.
- Eventual consistency aceptable para evaluación.
- Auditability.
- Traceability.
- Least privilege.
- Encryption in transit y provider defaults razonables at rest.
- Reproducibility.
- Cost awareness para un laboratorio personal.

## Lo que NO modela el dominio

- Core banking.
- Ledger.
- Disbursement.
- Pago de tarjeta.
- Scoring regulatorio real.
- Bureau de crédito real.
- PII real.
- AML/KYC completo.

Estas exclusiones deben aparecer también en el README para evitar que el proyecto parezca
representar un sistema bancario productivo completo.
