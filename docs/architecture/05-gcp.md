# 05 — Arquitectura GCP — Port

## Rol de Google Cloud

GCP es el segundo port del sistema. La implementación debe mantener el mismo contrato y
comportamiento observable sin forzar falsas equivalencias con AWS/Azure.

Pregunta permanente: **¿cómo modela Google Cloud esta capability y qué decisiones distintas
aparecen?**

## Stack objetivo V1

- Google Cloud API Gateway
- Cloud Run functions / función serverless equivalente vigente al implementar
- Firestore
- Cloud Storage
- Pub/Sub
- Dead-letter policy/topic cuando aplique
- Eventarc
- Service Accounts + Cloud IAM
- Secret Manager
- Cloud Logging / Cloud Monitoring
- Cloud Trace si aporta en V1.1
- Terraform Google Provider

## Flujo GCP

```
Client
  ↓
API Gateway
  ↓
Serverless Function
  ├── Firestore
  ├── Cloud Storage Signed URL
  └── Pub/Sub work channel
            ↓
       Evaluation Worker
            ├── Firestore
            └── Eventarc / event route
                    ├── Audit Handler
                    └── Notification Handler
```

> Verificar durante la implementación la integración concreta más idiomática entre Pub/Sub,
> Functions/Cloud Run y Eventarc. La arquitectura lógica prevalece sobre forzar un mapping
> superficial.

## Aspectos específicos

### API Gateway

- OpenAPI deployment/config;
- backend auth;
- service account implications;
- logging.

### Serverless compute

Google Cloud ha convergido capacidades alrededor de Cloud Run. Al implementar, documentar
claramente qué producto/runtime se usa y por qué, evitando nomenclatura obsoleta.

Investigar:

- service identity;
- concurrency/runtime model;
- timeout;
- event trigger;
- revision/deployment model si aplica.

### Firestore

- document/collection design;
- document key;
- query/index behavior;
- transaction/conditional semantics relevantes;
- consistency behavior;
- cost por operations.

No intentar copiar literalmente el single-table thinking de DynamoDB.

### Cloud Storage

- bucket privado;
- signed URL para upload;
- service account signing/permissions;
- object lifecycle solo si aporta valor.

### Pub/Sub

Este componente requiere especial atención porque no es una copia conceptual exacta de SQS.

Estudiar:

- topic + subscription model;
- acknowledgement;
- redelivery;
- retry policy;
- dead-letter topic;
- retention;
- ordering keys si fueran necesarias.

Documentar cómo se modela conceptualmente el `EvaluateApplication` work message.

### Eventarc

Investigar qué aporta como event routing y cómo se diferencia del uso directo de Pub/Sub.

No introducir Eventarc artificialmente si una integración concreta no corresponde: documentar el
trade-off y mantener el learning objective de event routing.

### Service Accounts + IAM

Mapear:

```
AWS IAM Role
Azure Managed Identity
GCP Service Account
```

Comparar:

- identity attachment;
- role binding;
- resource/project scope;
- impersonation;
- credentialless workload execution.

### Secret Manager

Secret ficticio y acceso mediante workload identity.

### Logging / Monitoring

Poder localizar:

- API/backend logs;
- function/service errors;
- Pub/Sub delivery/dead-letter condition;
- custom metric/alert mínimo.

## Terraform GCP

```
infra/gcp/
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

## Ejercicios obligatorios de consola

1. Revisar project y enabled APIs.
2. Ubicar serverless workload.
3. Revisar service account.
4. Revisar IAM bindings.
5. Explorar Firestore.
6. Revisar Cloud Storage object.
7. Revisar Pub/Sub topic/subscription y dead-letter handling.
8. Revisar event trigger/router.
9. Buscar correlation ID en Cloud Logging.
10. Revisar alert/metric.
11. Ejecutar `terraform destroy` y validar recursos residuales.

## Definition of Done GCP V1

La misma E2E suite debe validar el comportamiento funcional del port GCP.

## Preguntas de estudio

- ¿Por qué Pub/Sub no debe describirse simplemente como "SQS de GCP"?
- ¿Cómo cambia el modelo topic/subscription?
- ¿Qué diferencia hay entre Cloud Run service/function execution y Lambda?
- ¿Qué permisos necesita signed URL generation?
- ¿Cómo se expresa least privilege en project/resource IAM?
- ¿Qué diferencias de modelado aparecen entre Firestore y DynamoDB?
