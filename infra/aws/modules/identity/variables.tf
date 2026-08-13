variable "name_prefix" {
  description = "Prefix applied to every resource name in this module."
  type        = string
}

variable "tags" {
  description = "Tags applied to every resource in this module."
  type        = map(string)
  default     = {}
}

variable "dynamodb_table_arn" {
  type = string
}

variable "dynamodb_gsi_arn" {
  type = string
}

variable "s3_bucket_arn" {
  type = string
}

variable "sqs_queue_arn" {
  type = string
}

variable "eventbridge_bus_arn" {
  type = string
}
