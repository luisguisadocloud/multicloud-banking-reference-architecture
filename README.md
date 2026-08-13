# Multicloud Banking Reference Architecture

Reference architecture bancaria **portable** para practicar, comparar y demostrar arquitectura
cloud-native en **AWS, Azure y Google Cloud**, resolviendo el mismo problema de negocio, el mismo
contrato de API y los mismos escenarios de prueba en las tres nubes — sin comunicación entre ellas.

> ⚠️ **Disclaimer**: este es un laboratorio de arquitectura y portfolio técnico, no un sistema
> bancario real. No procesa dinero, no modela un ledger financiero, no usa datos de clientes reales
> ni implementa scoring crediticio o AML/KYC real. Todo dato es sintético.

## Principio rector

**Mismo problema de negocio → misma arquitectura lógica → implementaciones cloud-native
independientes → mismos escenarios de prueba.**

Cada despliegue vive íntegramente en una sola nube. AWS, Azure y GCP **no se comunican entre sí**
en esta PoC — portable no significa cross-cloud runtime.

## Caso de negocio

**Digital Credit Application Processing Platform** (ficticia): un cliente crea una solicitud de
crédito, adjunta documentos ficticios, la envía a evaluación, el sistema la procesa de forma
asíncrona, y el cliente consulta el resultado.

```
DRAFT → SUBMITTED → EVALUATING → { APPROVED | REJECTED | MANUAL_REVIEW }
```

Detalle completo: [`docs/01-business-case.md`](docs/01-business-case.md).

## Estado actual

🚧 **Bootstrap** — repositorio inicializado, especificación versionada, spec de M0 (Domain &
Contract) en construcción vía Spec-Driven Development. Ningún código de dominio ni infraestructura
cloud existe todavía. Ver progreso en [`docs/09-milestones-and-dod.md`](docs/09-milestones-and-dod.md).

## Cómo está organizado este repositorio

Este proyecto sigue **Spec-Driven Development** (GitHub spec-kit): cada milestone nace como una
spec (`requirements` → `design` → `tasks`) en `specs/`, versionada junto con el código, antes de
implementarse.

| Ruta                                         | Contenido                                                       |
| -------------------------------------------- | --------------------------------------------------------------- |
| `.specify/memory/constitution.md`            | Principios no negociables del proyecto (fuente de gobernanza)   |
| `specs/`                                     | Specs formales por milestone, generadas vía spec-kit            |
| `docs/00-vision-and-scope.md`                | Visión, objetivos, alcance V1/V1.1/V2 y fuera de alcance        |
| `docs/01-business-case.md`                   | Caso de negocio, dominio, API V1                                |
| `docs/architecture/`                         | Arquitectura lógica cloud-agnostic + arquitectura AWS/Azure/GCP |
| `docs/06-terraform-and-iac.md`               | Estrategia de Infrastructure as Code                            |
| `docs/07-testing-failure-observability.md`   | Testing, failure engineering, observabilidad                    |
| `docs/comparisons/08-aws-vs-azure-vs-gcp.md` | Comparativa viva AWS vs Azure vs GCP                            |
| `docs/09-milestones-and-dod.md`              | Milestones M0–M8 y Definition of Done                           |
| `docs/10-running-and-testing.md`             | Cómo desplegar y qué pruebas ejecutar, por nube                 |
| `docs/decisions/`                            | Architecture Decision Records                                   |
| `openapi/`                                   | Contrato API-First (`credit-application-api.yaml`)              |
| `src/domain`, `src/application`, `src/ports` | Dominio cloud-agnostic (hexagonal)                              |
| `src/adapters/{aws,azure,gcp}`               | Implementaciones por proveedor de los ports                     |
| `infra/{aws,azure,gcp}`                      | Terraform por proveedor, cada uno con su propio README de deploy|
| `tests/{contract,integration,e2e}`           | Suite de pruebas, la E2E se ejecuta contra las tres nubes       |

## Roadmap de milestones

`M0` Domain & Contract → `M1` AWS (reference implementation) → `M2` Azure (port) → `M3` GCP (port)
→ `M4` Failure Engineering → `M5` Observability → `M6` Containers + Networking → `M7` CI/CD →
`M8` Portfolio Polish.

Detalle y Definition of Done de cada uno: [`docs/09-milestones-and-dod.md`](docs/09-milestones-and-dod.md).

## Stack

TypeScript / Node.js para dominio, application layer, adapters y tests E2E. Terraform por
proveedor (sin capa "multi-cloud universal" — las diferencias entre nubes son precisamente lo que
este laboratorio busca estudiar). Ver principios completos en
[`.specify/memory/constitution.md`](.specify/memory/constitution.md).

## Desarrollo local

```bash
npm install
npm test          # unit tests del dominio (sin cloud)
npm run lint
```

Los flujos de despliegue por nube (`terraform init/plan/apply/destroy`, autenticación de cada CLI,
E2E contra un endpoint real) se documentan a partir de M1 en `docs/06-terraform-and-iac.md` y en el
README de cada `infra/<cloud>/`.
