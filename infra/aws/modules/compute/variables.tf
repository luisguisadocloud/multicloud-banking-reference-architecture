variable "name_prefix" {
  description = "Prefix applied to every resource name in this module."
  type        = string
}

variable "tags" {
  description = "Tags applied to every resource in this module."
  type        = map(string)
  default     = {}
}

variable "dynamodb_table_name" {
  type = string
}

variable "dynamodb_gsi_name" {
  type = string
}

variable "s3_bucket_name" {
  type = string
}

variable "sqs_queue_url" {
  type = string
}

variable "sqs_queue_arn" {
  type = string
}

variable "eventbridge_bus_name" {
  type = string
}

variable "eventbridge_bus_arn" {
  type = string
}

variable "secrets_manager_secret_arn" {
  type = string
}

variable "secrets_manager_secret_name" {
  type = string
}

variable "api_create_role_arn" {
  type = string
}

variable "api_documents_role_arn" {
  type = string
}

variable "api_submit_role_arn" {
  type = string
}

variable "api_get_role_arn" {
  type = string
}

variable "worker_evaluate_role_arn" {
  type = string
}

variable "event_audit_role_arn" {
  type = string
}

variable "event_notification_role_arn" {
  type = string
}
