# 00 — Visión, objetivos y alcance

> **Esta página fija la frontera del proyecto.** Si una implementación o sugerencia futura
> contradice este alcance, esta página prevalece hasta que el alcance sea actualizado
> explícitamente.

## Visión

Construir una **reference architecture bancaria portable** que se pueda desplegar como el mismo
sistema funcional en AWS, Azure y Google Cloud, comparando cómo cada proveedor resuelve las mismas
capabilities de arquitectura cloud-native.

Este proyecto sirve como:

- evidencia pública de architectural thinking;
- portfolio reproducible en GitHub.

## Nivel de profundidad por proveedor

El delivery sigue un enfoque **T-shaped**:

- AWS conserva la mayor profundidad y funciona como reference implementation.
- Azure debe alcanzar un nivel hands-on defendible.
- GCP debe alcanzar un nivel hands-on defendible.

Azure y GCP se documentan con el nivel de profundidad real alcanzado, sin presentarlos como
equivalentes en madurez a la reference implementation de AWS.

## Objetivos técnicos

Al finalizar el core, se debe poder:

1. Explicar la arquitectura sin mencionar un proveedor concreto.
2. Mapear cada capability hacia servicios AWS, Azure y GCP.
3. Desplegar y destruir cada implementación con Terraform.
4. Ejecutar el mismo flujo de negocio en las tres nubes.
5. Diagnosticar un fallo utilizando las herramientas de observabilidad de cada proveedor.
6. Comparar identity, messaging, events, NoSQL, storage, observability e IaC.
7. Explicar similitudes y diferencias importantes sin asumir equivalencias 1:1.

## Principios de diseño

### 1. Cloud-agnostic domain, cloud-native infrastructure

El dominio y los use cases no deben depender directamente de SDKs de AWS, Azure o GCP. La
infraestructura sí debe aprovechar servicios nativos de cada proveedor.

### 2. Comparar capabilities, no memorizar nombres

El aprendizaje debe partir de preguntas como:

- ¿Cómo resuelve esta nube asynchronous messaging?
- ¿Cómo representa workload identity?
- ¿Cómo funciona dead-letter handling?
- ¿Qué modelo de consistencia y particionamiento ofrece su datastore?

### 3. Portable no significa cross-cloud runtime

Cada variante se despliega de forma independiente. No habrá tráfico AWS → Azure → GCP.

### 4. Reproducibility first

Todo recurso relevante debe estar definido como código y poder recrearse con un flujo predecible de
Terraform.

### 5. Operar también es aprender

La PoC no termina cuando responde HTTP 200. Debe incluir inspección en consola, logs, metrics,
failures, retries y DLQ.

## Scope V1 — obligatorio

- OpenAPI compartido.
- Create / upload / submit / get application.
- Serverless compute.
- NoSQL.
- Object Storage con upload temporal firmado.
- Queue / asynchronous messaging.
- Retry + DLQ.
- Event routing.
- Workload Identity.
- Least privilege razonable para una PoC.
- Secrets manager nativo.
- Structured logs.
- Correlation ID.
- Metrics.
- Al menos una alarma operacional.
- Idempotency.
- Terraform por proveedor.
- Contract/integration/E2E tests compartidos.
- Failure scenarios reproducibles.

## Scope V1.1 — después de terminar el core

### Risk Engine containerizado

Agregar un servicio ficticio de evaluación de riesgo mediante managed containers:

- AWS ECS Fargate.
- Azure Container Apps.
- Google Cloud Run.

Esto permitirá estudiar Functions vs Containers y agregar networking de forma justificada.

### Networking

Introducir VPC/VNet/VPC, subnets y restricciones de service-to-service solo cuando existan
componentes que lo necesiten. No crear redes complejas únicamente para aumentar servicios en el
diagrama.

### Observability avanzada

Distributed tracing / OpenTelemetry cuando la arquitectura core funcione en las tres nubes.

### CI/CD

GitHub Actions + OIDC/federation, evitando long-lived cloud credentials.

## Scope V2 — opcional

- Customer identity.
- OAuth 2.0 / OIDC.
- WAF.
- Customer-managed keys.

## Fuera de alcance

### Kubernetes

EKS / AKS / GKE se estudiarán en una PoC independiente.

### Kafka / event streaming

La PoC actual cubre messaging y event routing, no streaming.

### SQL / ledger financiero

No implementar transferencias reales, ledger, double-entry accounting ni persistencia financiera
crítica.

### Orchestration engines

Step Functions, Durable Functions y Google Workflows quedan para otra PoC para mantener aquí una
arquitectura principalmente choreographed.

### Multi-region / DR real

Se pueden documentar consideraciones, pero no desplegar una topología DR completa en V1.

### AI scoring

El resultado de riesgo será deterministic/fictitious. AI/ML añadiría una dimensión innecesaria para
este objetivo.

### Datos reales

Nunca usar información de clientes, DNI, tarjetas, cuentas, documentos o secretos reales.

## Criterio para aceptar nuevas ideas

Antes de agregar una capability preguntar:

1. ¿Ayuda directamente a comparar las tres nubes?
2. ¿Representa una capability importante de arquitectura cloud?
3. ¿Puede estudiarse sin duplicar otra PoC especializada?
4. ¿Su beneficio de aprendizaje justifica el costo adicional?

Si la respuesta principal es "hará el diagrama más completo", no debe entrar.
