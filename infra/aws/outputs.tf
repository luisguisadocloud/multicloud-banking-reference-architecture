output "api_base_url" {
  description = "Base URL of the deployed HTTP API — set as BASE_URL for the shared E2E suite."
  value       = module.api.api_base_url
}

output "dynamodb_table_name" {
  description = "DynamoDB table name — useful to inspect state directly during a lab session."
  value       = module.database.table_name
}

output "s3_bucket_name" {
  description = "S3 bucket name for uploaded documents."
  value       = module.storage.bucket_name
}

output "sqs_queue_url" {
  description = "Evaluation queue URL — useful for manual message inspection/debugging."
  value       = module.messaging.queue_url
}

output "sqs_dlq_url" {
  description = "Evaluation dead-letter queue URL — check here when diagnosing failure scenarios (User Story 2)."
  value       = module.messaging.dlq_url
}

output "eventbridge_bus_name" {
  description = "Custom EventBridge bus carrying ApplicationEvaluated events."
  value       = module.events.bus_name
}

output "cloudwatch_log_group_names" {
  description = "Log group per Lambda — starting point for correlationId-based debugging (User Story 2)."
  value       = module.observability.log_group_names
}

# Intentionally no output for the Secrets Manager secret value or ARN in a way that would leak
# it — docs/06-terraform-and-iac.md: "Nunca output de secrets en plaintext."
