# 09 — Milestones y Definition of Done

## Objetivo

Evitar que la PoC crezca indefinidamente y mantener una secuencia de aprendizaje que genere valor
visible desde temprano.

## M0 — Domain & Contract

### Entregables

- README inicial.
- Domain model mínimo.
- State transitions.
- OpenAPI.
- Hexagonal boundaries / ports.
- Unit tests principales.
- Fixtures sintéticos.

### Definition of Done

Se puede ejecutar el dominio localmente sin SDK cloud y explicar el flujo completo en términos de
capabilities.

---

## M1 — AWS Reference Implementation

### Entregables

- Terraform AWS.
- API Gateway.
- Lambda.
- DynamoDB.
- S3 signed upload.
- SQS + DLQ.
- EventBridge.
- IAM.
- Secret ficticio.
- CloudWatch.
- E2E tests.

### Definition of Done

Happy path + idempotency + failure→retry→DLQ funcionan y pueden diagnosticarse desde AWS
Console/CloudWatch.

---

## M2 — Azure Port

### Entregables

- Terraform Azure.
- API Management.
- Functions.
- Cosmos DB.
- Blob + SAS.
- Service Bus.
- Event Grid.
- Managed Identity/RBAC.
- Key Vault.
- Azure Monitor/Application Insights.

### Definition of Done

La misma E2E suite valida el port y existe una primera comparación AWS vs Azure basada en hands-on.

---

## M3 — GCP Port

### Entregables

- Terraform GCP.
- API Gateway.
- Serverless compute.
- Firestore.
- Cloud Storage signed upload.
- Pub/Sub/dead-letter handling.
- Event routing.
- Service Accounts/IAM.
- Secret Manager.
- Logging/Monitoring.

### Definition of Done

La misma E2E suite valida el port y la matriz AWS/Azure/GCP tiene observaciones reales.

---

## M4 — Failure Engineering

Ejecutar deliberadamente:

- duplicate request;
- duplicate message;
- worker exception;
- poison message;
- permission error;
- timeout;
- downstream consumer failure.

### Definition of Done

Cada nube tiene un pequeño runbook de troubleshooting.

---

## M5 — Observability

### Entregables

- structured logging consistente;
- correlation propagation;
- métricas relevantes;
- alarma mínima;
- comparación de debugging experience.

### Definition of Done

Se puede tomar un `correlationId` y seguir la operación end-to-end con evidencia suficiente en cada
proveedor.

---

## M6 — Containers + Networking — V1.1

Agregar **Risk Engine** ficticio como managed container.

### AWS

ECS Fargate.

### Azure

Container Apps.

### GCP

Cloud Run.

### Temas

- Function vs container trade-off;
- private/public ingress;
- networking;
- service-to-service auth;
- scaling;
- logs.

### Definition of Done

El core sigue funcionando y el container extension aporta una comparación arquitectónica clara sin
romper portabilidad conceptual.

---

## M7 — CI/CD — V1.1

### Entregables

GitHub Actions:

- lint/test;
- terraform fmt/validate;
- plan;
- deploy manual por cloud;
- OIDC/federation cuando sea posible;
- destroy manual controlado.

No automatizar deployments costosos en cada push.

---

## M8 — Portfolio Polish

### Entregables

- logical architecture diagram;
- AWS diagram;
- Azure diagram;
- GCP diagram;
- architecture decision records;
- comparison matrix;
- failure engineering write-up;
- screenshots sanitizadas opcionales;
- README final;
- repository topics/description;
- artículo potencial.

## Definition of Done global

La PoC puede considerarse finalizada cuando:

- [ ] El dominio y OpenAPI son cloud-agnostic.
- [ ] AWS despliega y funciona.
- [ ] Azure despliega y funciona.
- [ ] GCP despliega y funciona.
- [ ] Terraform puede destruir cada variante.
- [ ] La misma E2E suite corre contra las tres.
- [ ] Se prueba idempotency.
- [ ] Se prueba retry/dead-letter.
- [ ] Correlation ID es trazable.
- [ ] Existe workload identity sin credentials hardcoded.
- [ ] Existe al menos una alarma útil por cloud.
- [ ] Hay diagramas de las tres arquitecturas.
- [ ] Hay comparación escrita basada en hands-on.
- [ ] El README explica claramente límites y uso ficticio bancario.
- [ ] No contiene secrets ni información bancaria real.

## Regla de cierre

Una vez cumplido el Definition of Done global, **cerrar la PoC antes de añadir Kubernetes, SQL,
Kafka, DR, CIAM u otras dimensiones**. Esas capacidades pertenecen al backlog de PoCs
especializadas.
