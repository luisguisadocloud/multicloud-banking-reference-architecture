variable "aws_region" {
  description = "AWS region to deploy the reference implementation into."
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project identifier used in resource names and tags (docs/06-terraform-and-iac.md naming convention)."
  type        = string
  default     = "multicloud-banking"
}

variable "environment" {
  description = "Environment tag for this lab deployment."
  type        = string
  default     = "lab"
}

variable "owner" {
  description = "Owner tag — who this lab deployment belongs to."
  type        = string
  default     = "luisguisado"
}

variable "sqs_max_receive_count" {
  description = "Number of SQS delivery attempts before a message moves to the DLQ (FR-006)."
  type        = number
  default     = 3
}

variable "log_retention_in_days" {
  description = "CloudWatch Logs retention for every Lambda log group — set explicitly rather than left at never-expire."
  type        = number
  default     = 14
}
