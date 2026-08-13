# ports

Domain-shaped interfaces implemented by cloud adapters — designed around what the application
layer needs, never as a `UniversalCloudService` abstraction (constitution Principle I).

- `ApplicationRepository` — save/find a `CreditApplication`, including idempotency-key lookup.
- `DocumentStorage` — authorize a document upload (returns an opaque `objectKey`; no binary transfer).
- `EvaluationQueue` — enqueue an `EvaluateApplication` work item.
- `DomainEventPublisher` — publish an `ApplicationEvent` (`ApplicationEvaluated`).

M0 exercises all four exclusively through in-memory fakes in `tests/unit/fakes/`. Real adapters
(DynamoDB/Cosmos DB/Firestore, S3/Blob/GCS, SQS/Service Bus/Pub-Sub, EventBridge/Event Grid/Eventarc)
are built per cloud in `src/adapters/{aws,azure,gcp}` starting M1.
