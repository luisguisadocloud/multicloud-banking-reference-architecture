# 02 — Arquitectura lógica cloud-agnostic

> **Esta es la source of truth conceptual.** Primero se razona en capabilities; después se traduce
> a servicios concretos de cada proveedor.

## Flujo lógico

```
Client
  │
  ▼
API / Edge
  │
  ▼
Application API / Functions
  ├──────────────► NoSQL Application Store
  │
  ├──────────────► Object Storage authorization
  │
  └──────────────► Evaluation Queue
                       │
                       ▼
                Evaluation Worker
                       │
                       ├────► NoSQL Application Store
                       │
                       └────► Event Router
                                 │
                       ┌─────────┴─────────┐
                       ▼                   ▼
                   Audit Handler      Notification Handler
```

## Responsabilidades

### API / Edge

- Exponer contrato HTTP.
- Routing.
- Basic throttling/configuración cuando corresponda.
- No contener lógica de negocio.

### Application API / Functions

- Validar request.
- Ejecutar use cases.
- Persistir application state vía port.
- Generar upload authorization vía storage port.
- Encolar trabajo vía messaging port.

### NoSQL Application Store

Persistencia operacional de la solicitud. Aspectos que deben compararse entre proveedores:

- partition key / document key;
- indexes;
- consistency;
- conditional writes;
- optimistic concurrency;
- throughput/capacity model;
- pricing implications.

### Object Storage

Guardar documentos ficticios. El upload preferido es directo desde cliente mediante autorización
temporal firmada.

Razón: evitar transportar binarios grandes a través de una Function innecesariamente.

### Evaluation Queue

Representa **trabajo pendiente**. Su semántica conceptual es command/work distribution, no business
event broadcast.

Debe considerar:

- at-least-once delivery;
- visibility/lock/ack semantics según proveedor;
- retries;
- DLQ;
- duplicate deliveries.

### Evaluation Worker

Consumidor idempotente que:

1. recupera la solicitud;
2. verifica si ya fue evaluada;
3. ejecuta decisión ficticia;
4. persiste resultado de forma segura;
5. publica domain event.

### Event Router

Transporta el hecho `ApplicationEvaluated` hacia cero o más consumidores. Aquí debe estudiarse la
diferencia entre **queueing**, **publish/subscribe** y **event routing** en cada cloud.

### Audit Handler

Persistencia o logging de auditoría simplificado. No construir un sistema regulatorio completo.

### Notification Handler

Para V1 puede ser un mock/log de notificación. No es necesario integrar email/SMS real si no aporta
aprendizaje multi-cloud relevante.

## Idempotency

### API idempotency

`POST /applications` recibe `Idempotency-Key`. El sistema debe poder responder a una repetición sin
crear una segunda solicitud lógica.

### Consumer idempotency

El worker debe tolerar redelivery del mismo mensaje. Patrones posibles:

- status/version check;
- processed message record;
- conditional update;
- combinación según datastore.

La implementación debe documentar qué patrón se eligió y por qué.

## Correlation y traceability

Propagar como mínimo:

- `correlationId`
- `applicationId`
- `eventId/messageId` cuando aplique.

Structured log mínimo:

```json
{
  "level": "INFO",
  "correlationId": "...",
  "applicationId": "...",
  "component": "evaluation-worker",
  "event": "ApplicationEvaluated"
}
```

## Failure model

Diseñar fallos esperables:

- invalid request;
- datastore unavailable/permission failure;
- worker exception;
- timeout;
- duplicate delivery;
- poison message;
- event consumer failure.

El proyecto debe observar qué hace cada plataforma, no ocultar todos los fallos detrás de una
abstracción.

## Security boundaries

### Human/customer identity

Fuera del core V1.

### Workload identity

Obligatorio. Ningún workload debe usar access keys hardcoded.

### Secrets

Solo para información que realmente deba ser secreta. No guardar configuración ordinaria como
secret por costumbre.

### Data

Todos los datos del repo y pruebas deben ser ficticios.

## Hexagonal / Ports & Adapters

Ports sugeridos:

- `ApplicationRepository`
- `DocumentStorage`
- `EvaluationQueue`
- `DomainEventPublisher`
- `SecretProvider` solo si el dominio/aplicación realmente lo necesita
- clock/id generator abstractions cuando faciliten testing

Adapters por provider:

- Dynamo / Cosmos / Firestore repositories.
- S3 / Blob / GCS storage.
- SQS / Service Bus / Pub/Sub messaging.
- EventBridge / Event Grid / Eventarc event publishing.

La abstracción se diseña sobre necesidades del sistema, no sobre la idea de crear una
`UniversalCloudService`.

## Estructura conceptual del repositorio

```
multicloud-banking-reference-architecture/
├── README.md
├── docs/
│   ├── architecture/
│   ├── decisions/
│   └── comparisons/
├── openapi/
│   └── credit-application-api.yaml
├── src/
│   ├── domain/
│   ├── application/
│   ├── ports/
│   └── adapters/
│       ├── aws/
│       ├── azure/
│       └── gcp/
├── infra/
│   ├── aws/
│   ├── azure/
│   └── gcp/
├── tests/
│   ├── contract/
│   ├── integration/
│   └── e2e/
├── scripts/
└── Makefile
```

La estructura final puede evolucionar si el runtime de cada proveedor exige packaging distinto,
pero se debe conservar separación conceptual clara.
