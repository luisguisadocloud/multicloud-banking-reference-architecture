# 04 — Arquitectura Azure — Port

## Rol de Azure

Azure no debe implementarse como un proyecto nuevo desde cero. Debe ser un **port deliberado de la
architecture capability model** ya validada en AWS.

Pregunta permanente: **¿cómo resuelve Azure esta capability y qué diferencias relevantes
introduce?**

## Stack objetivo V1

- Azure API Management
- Azure Functions
- Azure Cosmos DB
- Azure Blob Storage
- Azure Service Bus Queue
- Dead-letter queue de Service Bus
- Azure Event Grid
- Managed Identity + Azure RBAC
- Azure Key Vault
- Azure Monitor / Application Insights
- Terraform AzureRM

## Flujo Azure

```
Client
  ↓
API Management
  ↓
Azure Functions
  ├── Cosmos DB
  ├── Blob Storage + SAS
  └── Service Bus Queue
            ↓
       Evaluation Function
            ├── Cosmos DB
            └── Event Grid
                    ├── Audit Handler
                    └── Notification Handler
```

## Objetivo de aprendizaje

No limitarse a traducir nombres. Para cada componente documentar:

- modelo de identity;
- permissions/RBAC;
- trigger/binding/runtime model;
- retries;
- dead-letter semantics;
- observability;
- provisioning experience;
- pricing/cost gotchas del laboratorio.

## Aspectos específicos

### Azure API Management

- tier adecuado para laboratorio;
- API import desde OpenAPI si conviene;
- backend routing;
- policies solo cuando aporten al caso;
- atención al costo: APIM puede ser uno de los componentes más costosos dependiendo del tier.
  Documentar la decisión si se usa una alternativa temporal para labs.

### Azure Functions

- hosting plan elegido y razones;
- managed identity;
- triggers/bindings vs SDK directo;
- configuration;
- cold start / runtime considerations;
- logs en Application Insights.

### Cosmos DB

- API/model seleccionado;
- partition key;
- request units / serverless mode si está disponible y conviene;
- consistency levels;
- optimistic concurrency / ETags cuando corresponda;
- indexing policy.

### Blob Storage

- container privado;
- SAS de duración limitada para upload;
- lifecycle/cost settings solo si aportan valor.

### Service Bus

- queue semantics;
- PeekLock/settlement concepts;
- delivery count;
- max delivery;
- DLQ;
- duplicate detection si se decide usarla y por qué;
- sessions solo si existe requerimiento de ordering/session affinity.

### Event Grid

- event routing;
- subscriptions;
- filters;
- retry/dead-letter behavior;
- distinguir Event Grid de Service Bus.

### Managed Identity / RBAC

Este es uno de los focos principales de aprendizaje Azure.

Mapear explícitamente:

```
AWS execution role
        ↓ conceptualmente
Azure Managed Identity + role assignments
```

Documentar dónde la analogía se rompe.

### Key Vault

- secret ficticio;
- managed identity para acceso;
- evitar secretos en Terraform state cuando sea posible/documentar implicaciones.

### Azure Monitor / Application Insights

Investigar:

- logs de Functions;
- traces/dependencies;
- failed requests;
- Service Bus metrics;
- alarms/action groups mínimos para laboratorio.

## Terraform Azure

```
infra/azure/
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

Evitar crear un módulo compartido con AWS solo para aparentar abstracción multi-cloud.

## Ejercicios obligatorios de portal

Después de `terraform apply`:

1. Ubicar Resource Group.
2. Identificar Function App/Functions.
3. Inspeccionar Managed Identity.
4. Localizar role assignments.
5. Revisar Cosmos DB data explorer.
6. Revisar Service Bus queue/DLQ.
7. Inspeccionar Event Grid subscription.
8. Consultar Application Insights / Monitor.
9. Forzar un fallo y localizarlo.
10. Destruir infraestructura y revisar qué quedó fuera de Terraform.

## Definition of Done Azure V1

Mismos criterios funcionales de AWS, ejecutando la misma E2E suite contra el endpoint Azure.

## Preguntas de estudio

- ¿Qué diferencia existe entre Managed Identity y AWS execution role?
- ¿Cómo funciona RBAC scope en subscription/resource group/resource?
- ¿Cómo se comporta Service Bus ante un handler fallido?
- ¿Qué diferencia conceptual existe entre Service Bus y Event Grid?
- ¿Qué implica elegir una consistency level de Cosmos DB?
- ¿Qué recursos/tier podrían generar costo aunque casi no haya requests?
