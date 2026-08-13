# 06 — Terraform e Infrastructure as Code

> Terraform debe permitir crear cada implementación, experimentar en consola, reproducir escenarios
> de fallo y destruir el entorno de forma predecible.

## Objetivos

- Reproducibilidad.
- Cost control mediante infraestructura efímera.
- Comparación directa entre providers.
- Aprendizaje de resource models y dependencies.
- Evitar configuración manual irrepetible.

## Regla principal

Mantener infraestructura separada:

```
infra/
├── aws/
├── azure/
└── gcp/
```

No crear una capa Terraform "multi-cloud universal" que esconda las diferencias que precisamente se
quieren estudiar.

## Workflow diario

Por proveedor:

```
terraform init
terraform fmt -check
terraform validate
terraform plan
terraform apply
     ↓
inspect cloud console
     ↓
execute E2E tests
     ↓
experiment / break / observe
     ↓
terraform destroy
```

## Makefile / scripts

Objetivo de ergonomía futura:

```bash
make deploy CLOUD=aws
make test CLOUD=aws
make destroy CLOUD=aws
```

Misma interfaz para Azure/GCP, sin esconder los comandos Terraform reales de la documentación.

## State strategy V1

**Local state** para simplificar el laboratorio inicial.

Agregar a `.gitignore`:

```
*.tfstate
*.tfstate.*
.terraform/
```

No incluir secrets en variables versionadas.

## Remote state — posterior

Aprender posteriormente:

- AWS: S3 backend + locking mechanism vigente.
- Azure: Storage Account backend.
- GCP: GCS backend.

No implementarlo desde el inicio porque introduce bootstrap infrastructure que podría sobrevivir a
`destroy` y distraer del objetivo principal.

## Providers y autenticación local

El README debe explicar la preparación local para cada CLI/provider sin almacenar credenciales en
el repo.

### AWS

Perfil/SSO/credential chain apropiada para entorno personal.

### Azure

Azure CLI / provider authentication segura.

### GCP

Application Default Credentials / gcloud para desarrollo local cuando corresponda.

Documentar exactamente el mecanismo elegido.

## Naming y tags/labels

Definir convención consistente:

- project/poc identifier;
- environment (`lab`);
- owner;
- managed-by=`terraform`;
- cost-center/tag equivalente solo si aporta.

Evitar tags inventados que no tengan uso.

## Cost safety

- seleccionar tiers serverless/consumption adecuados;
- outputs útiles para localizar endpoints;
- automatizar `destroy` manualmente al terminar sesión;
- revisar recursos globales o con retención;
- revisar logs/storage que puedan persistir;
- evitar NAT Gateway u otros recursos de costo alto sin necesidad.

## Modules

Crear módulos cuando representan una capability cohesionada y reducen duplicación real.

Buenos candidatos:

- messaging + DLQ;
- observability;
- API integration;
- workload identity.

Evitar módulo por cada recurso trivial.

## Outputs mínimos

- API base URL.
- storage/container/bucket name si ayuda a pruebas.
- queue/topic identifiers necesarios para debugging.
- observability entry points cuando sea útil.

Nunca output de secrets en plaintext.

## Destroy verification checklist

Después de destruir:

- revisar compute;
- database;
- storage;
- messaging;
- event resources;
- logs/workspaces si fueron gestionados;
- IAM identities/role assignments;
- recursos globales;
- provider-specific soft-delete/retention behavior.

Registrar recursos que no puedan eliminarse inmediatamente y explicar por qué.

Ejemplo concreto: AWS Secrets Manager no borra un secret al instante — lo deja "scheduled for
deletion" con un recovery window (default 30 días), y bloquea crear un secret nuevo con el mismo
nombre mientras tanto. En recursos lab sin valor real que proteger, poner
`recovery_window_in_days = 0` evita el choque en el próximo `apply` (ver
`specs/002-aws-reference-implementation/research.md` Decision 11).

## IaC comparison notes

Durante cada port registrar:

- número de resources Terraform necesarios;
- dependencies no obvias;
- provider quirks;
- APIs/features que deben habilitarse;
- identity bootstrap;
- recursos con eventual consistency durante provisioning;
- recursos lentos/costosos de crear y destruir.

Esto forma parte del aprendizaje, no es ruido del proyecto.
