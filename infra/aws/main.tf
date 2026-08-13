locals {
  name_prefix = "${var.project_name}-${var.environment}"

  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    Owner       = var.owner
    ManagedBy   = "terraform"
  }
}

# --- Base resources: no dependencies on each other ---

module "database" {
  source      = "./modules/database"
  name_prefix = local.name_prefix
  tags        = local.common_tags
}

module "storage" {
  source      = "./modules/storage"
  name_prefix = local.name_prefix
  tags        = local.common_tags
}

module "messaging" {
  source            = "./modules/messaging"
  name_prefix       = local.name_prefix
  tags              = local.common_tags
  max_receive_count = var.sqs_max_receive_count
}

module "events" {
  source      = "./modules/events"
  name_prefix = local.name_prefix
  tags        = local.common_tags
}

# --- Identity: least-privilege role + policy per Lambda, scoped to the resources above ---
# Also owns the fictitious RISK_ENGINE_API_KEY secret (T045), since access to it is an
# identity/least-privilege concern (only worker-evaluate's role may read it).

module "identity" {
  source      = "./modules/identity"
  name_prefix = local.name_prefix
  tags        = local.common_tags

  dynamodb_table_arn  = module.database.table_arn
  dynamodb_gsi_arn    = module.database.gsi_arn
  s3_bucket_arn       = module.storage.bucket_arn
  sqs_queue_arn       = module.messaging.queue_arn
  eventbridge_bus_arn = module.events.bus_arn
}

# --- Compute: the 7 Lambda functions. Owns the SQS event-source-mapping and the EventBridge
# rule+targets too, since those bindings need the Lambda ARNs this module creates (see
# infra/aws/modules/compute/README.md for why this isn't split further).

module "compute" {
  source      = "./modules/compute"
  name_prefix = local.name_prefix
  tags        = local.common_tags

  dynamodb_table_name         = module.database.table_name
  dynamodb_gsi_name           = module.database.gsi_name
  s3_bucket_name              = module.storage.bucket_name
  sqs_queue_url               = module.messaging.queue_url
  sqs_queue_arn               = module.messaging.queue_arn
  eventbridge_bus_name        = module.events.bus_name
  eventbridge_bus_arn         = module.events.bus_arn
  secrets_manager_secret_arn  = module.identity.risk_engine_secret_arn
  secrets_manager_secret_name = module.identity.risk_engine_secret_name

  api_create_role_arn         = module.identity.api_create_role_arn
  api_documents_role_arn      = module.identity.api_documents_role_arn
  api_submit_role_arn         = module.identity.api_submit_role_arn
  api_get_role_arn            = module.identity.api_get_role_arn
  worker_evaluate_role_arn    = module.identity.worker_evaluate_role_arn
  event_audit_role_arn        = module.identity.event_audit_role_arn
  event_notification_role_arn = module.identity.event_notification_role_arn
}

# --- API Gateway: HTTP API in front of the 4 API-facing Lambdas ---

module "api" {
  source      = "./modules/api"
  name_prefix = local.name_prefix
  tags        = local.common_tags

  api_create_lambda_arn     = module.compute.api_create_invoke_arn
  api_create_lambda_name    = module.compute.api_create_function_name
  api_documents_lambda_arn  = module.compute.api_documents_invoke_arn
  api_documents_lambda_name = module.compute.api_documents_function_name
  api_submit_lambda_arn     = module.compute.api_submit_invoke_arn
  api_submit_lambda_name    = module.compute.api_submit_function_name
  api_get_lambda_arn        = module.compute.api_get_invoke_arn
  api_get_lambda_name       = module.compute.api_get_function_name
}

# --- Observability: log groups per Lambda + the DLQ-depth alarm (FR-011) ---

module "observability" {
  source      = "./modules/observability"
  name_prefix = local.name_prefix
  tags        = local.common_tags

  lambda_function_names = module.compute.all_function_names
  log_retention_in_days = var.log_retention_in_days
  dlq_name              = module.messaging.dlq_name
}
