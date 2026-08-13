# 07 — Testing, Failure Scenarios y Observability

## Filosofía

El proyecto debe demostrar que **funciona y falla de manera observable**. Un architecture diagram
sin pruebas y operación real no satisface el objetivo.

## Test layers

### Unit tests

Dominio y application services sin cloud. Probar:

- state transitions;
- decision rules ficticias;
- validation;
- idempotency logic abstracta cuando corresponda.

### Contract tests

Validar requests/responses contra OpenAPI cuando sea viable.

### Integration tests

Adapters específicos de provider cuando aporten valor.

### E2E tests compartidos

La misma suite debe recibir `BASE_URL` y ejecutarse contra AWS, Azure o GCP.

Ejemplos:

```bash
BASE_URL=<aws-url> npm run test:e2e
BASE_URL=<azure-url> npm run test:e2e
BASE_URL=<gcp-url> npm run test:e2e
```

## Happy-path scenarios

- Create application.
- Generate document upload authorization.
- Upload synthetic document.
- Submit application.
- Poll/query hasta estado final.
- Validar que el resultado esperado sea observable.

## Idempotency scenarios

### Duplicate API request

Enviar dos veces `POST /applications` con la misma `Idempotency-Key`. Esperado: una única solicitud
lógica.

### Duplicate submit

Repetir `submit`. Esperado: no producir múltiples evaluaciones efectivas.

### Duplicate message

Simular/redeliver mensaje cuando sea posible. Esperado: worker idempotente.

## Failure engineering scenarios

### 1. Invalid payload

Esperado: 4xx consistente y log estructurado apropiado.

### 2. Evaluation worker exception

Forzar error determinista desde fixture/test input. Observar:

- retry;
- delivery attempts;
- logs;
- eventual DLQ/dead-letter destination.

### 3. Missing permission

Retirar temporalmente un permiso mediante una variante controlada o configuración de lab. Observar
error de authorization en logs y comprender identity chain. No dejar IAM inseguro como "fix".

### 4. Timeout

Configurar un escenario que exceda el timeout deliberadamente. Comparar comportamiento del runtime
y broker.

### 5. Poison message

Mensaje que siempre falla. Objetivo: entender redrive/dead-letter semantics.

### 6. Event consumer failure

El procesamiento principal ya terminó; un consumidor downstream falla. Analizar coupling y retry
independiente.

## Observability contract

Todos los componentes deben producir structured logs con campos consistentes cuando sea posible:

- `timestamp`
- `level`
- `service/component`
- `correlationId`
- `applicationId`
- `messageId` o `eventId`
- `operation`
- `errorType` cuando aplique

No loggear contenido sensible.

## Correlation flow

```
HTTP request
   │ correlationId
   ▼
API function
   │
   ├─ datastore operation
   │
   └─ queue message { correlationId }
             │
             ▼
          worker
             │
             └─ domain event { correlationId }
                       │
                       ▼
                  consumers
```

## Metrics mínimas

- API errors.
- Worker errors.
- Queue backlog/depth o métrica equivalente.
- Dead-letter condition/count.
- Processing duration opcional.
- ApplicationEvaluated count opcional como business metric.

## Alarm mínima

Al menos una alarma útil por proveedor, por ejemplo:

- mensajes en DLQ;
- número de failures superior a threshold;
- queue backlog inesperado.

No crear diez alarmas decorativas.

## Runbook de debugging

Para cada nube documentar:

1. ¿Dónde empiezo ante una solicitud fallida?
2. ¿Cómo busco por correlation ID?
3. ¿Cómo encuentro el worker invocation?
4. ¿Cómo veo retries?
5. ¿Dónde está la DLQ?
6. ¿Cómo inspecciono el mensaje?
7. ¿Cómo identifico un permission error?
8. ¿Qué métrica confirma el problema?

## Evidence for portfolio

Agregar capturas solo cuando ayuden, sin exponer account IDs, subscription/project data sensible o
secretos.

Mejor evidencia:

- architecture diagram;
- test output;
- sanitized log example;
- failure scenario walkthrough;
- comparison notes.

## Definition of Done

No considerar una nube "implementada" hasta ejecutar al menos:

- happy path;
- duplicate request;
- worker failure + retry;
- dead-letter scenario;
- correlation-based debugging.
