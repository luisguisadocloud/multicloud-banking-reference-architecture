# 10 — Running & Testing per Cloud

> Punto de entrada operativo: cómo desplegar (referencia rápida) y qué pruebas ejecutar contra cada
> implementación cloud una vez desplegada. La estrategia general de testing (qué escenarios deben
> existir y por qué) está en `docs/07-testing-failure-observability.md`; esta página es la
> ejecución concreta, nube por nube.

## AWS

### Deploy

Comandos de Terraform, prerequisitos y estructura de módulos: [`infra/aws/README.md`](../infra/aws/README.md).

Antes del primer `apply`: `npm run build:lambda` para empaquetar los 7 handlers.

### Validación en consola

Después de `terraform apply`, confirmar en la consola de AWS:

1. La tabla DynamoDB y su GSI `idempotencyKey-index`.
2. El bucket S3 — confirmar que el acceso público está bloqueado.
3. La cola SQS y su DLQ.
4. El bus custom de EventBridge y su rule.
5. Las 7 Lambda y sus execution roles — cada policy debe nombrar solo lo que esa Lambda necesita
   (ADR-009).
6. El secret en Secrets Manager — solo el role de `worker-evaluate` debe poder leerlo.
7. La alarma de CloudWatch sobre profundidad de la DLQ.

### Probar manualmente con curl

El contrato completo está en [`openapi/credit-application-api.yaml`](../openapi/credit-application-api.yaml).
Exportar la URL base una sola vez (parado en `infra/aws`, igual que el `apply` de la sección
anterior):

```bash
export BASE_URL=$(terraform output -raw api_base_url)
```

**1. Crear una aplicación** — `Idempotency-Key` es obligatorio; `X-Correlation-Id` es opcional (si
se omite, el sistema genera uno y lo devuelve en el body):

```bash
curl -sS -X POST "$BASE_URL/applications" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{"customerReference": "CUSTOMER-001", "requestedAmount": 5000}'
```

Guardar el `applicationId` de la respuesta (`201`) para los pasos siguientes:

```bash
APPLICATION_ID=$(curl -sS -X POST "$BASE_URL/applications" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{"customerReference": "CUSTOMER-001", "requestedAmount": 5000}' | jq -r '.applicationId')
```

Repetir la misma request con el mismo `Idempotency-Key` debe devolver la misma aplicación (`201`,
mismo `applicationId`) en lugar de crear una segunda — así se valida FR-005 manualmente.

**2. (Opcional) Autorizar la subida de un documento:**

```bash
curl -sS -X POST "$BASE_URL/applications/$APPLICATION_ID/documents" \
  -H "Content-Type: application/json" \
  -d '{"type": "income-proof"}'
```

Devuelve `uploadUrl` (presigned S3) — no es necesario subir un archivo real para el resto del flujo.

**3. Enviar la aplicación a evaluación** — transiciona `DRAFT` → `SUBMITTED`/`EVALUATING` y encola
el trabajo asíncrono en SQS:

```bash
curl -sS -X POST "$BASE_URL/applications/$APPLICATION_ID/submit"
```

Reenviar la misma request (mismo `applicationId`) debe ser un no-op idempotente (FR-006): no debe
encolar una segunda evaluación efectiva.

**4. Consultar el estado** — la evaluación es asíncrona (worker Lambda disparado por SQS), así que
puede tardar unos segundos en salir de `EVALUATING`:

```bash
curl -sS "$BASE_URL/applications/$APPLICATION_ID"
```

Repetir hasta ver `status` en `APPROVED` o `MANUAL_REVIEW` (`requestedAmount >= 50000` siempre cae
en `MANUAL_REVIEW`; el resto queda `APPROVED` — `src/domain/decisionEngine.ts`).

### Suite E2E compartida

```bash
BASE_URL=<terraform output api_base_url> npm run test:e2e
```

Debe pasar sin modificaciones contra el endpoint real: happy path, duplicate request, worker
failure + retry, dead-letter scenario.

### Forzar un fallo y diagnosticarlo

1. Crear y enviar una aplicación con `customerReference: "FORCE_FAILURE"` — este fixture (nunca un
   valor de negocio real, ver `src/domain/decisionEngine.ts`) hace que `evaluateApplication` lance
   una excepción determinística *antes* de invocar al decision engine, simulando un fallo técnico
   real del worker:

   ```bash
   APPLICATION_ID=$(curl -sS -X POST "$BASE_URL/applications" \
     -H "Content-Type: application/json" \
     -H "Idempotency-Key: $(uuidgen)" \
     -d '{"customerReference": "FORCE_FAILURE", "requestedAmount": 5000}' | jq -r '.applicationId')

   curl -sS -X POST "$BASE_URL/applications/$APPLICATION_ID/submit"
   ```
2. Observar cómo SQS reintenta la entrega hasta `maxReceiveCount` y el mensaje cae en la DLQ —
   como nada se persiste en cada intento fallido, la aplicación queda en `EVALUATING` y cada
   redelivery repite el mismo fallo (`SimulatedEvaluationFailureError`).
3. Confirmar que la alarma `evaluation-dlq-depth` refleja la condición.
4. Tomar el `correlationId` de la solicitud original y buscarlo en CloudWatch Logs Insights a
   través de los log groups `api-submit` y `worker-evaluate` — cada línea relacionada debe
   encontrarse por ese ID.

### Destroy y re-verificación de reproducibilidad

```bash
terraform destroy
```

Recorrer el [destroy verification checklist](06-terraform-and-iac.md#destroy-verification-checklist)
(compute, database, storage, messaging, eventos, logs, IAM, recursos con retención). Volver a
correr `terraform apply` sin cambios de configuración y confirmar que el happy path anterior vuelve
a pasar.

### Definition of Done

Por `docs/09-milestones-and-dod.md`: happy path + idempotency + failure→retry→DLQ deben funcionar y
poder diagnosticarse desde la consola/CloudWatch. Cada sección de arriba es exactamente esa
verificación, hecha concreta y ejecutable.

## Azure

Populated en **M2 — Azure Port**.

## GCP

Populated en **M3 — GCP Port**.
