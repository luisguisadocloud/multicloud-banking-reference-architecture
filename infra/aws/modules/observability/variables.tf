variable "name_prefix" {
  description = "Prefix applied to every resource name in this module."
  type        = string
}

variable "tags" {
  description = "Tags applied to every resource in this module."
  type        = map(string)
  default     = {}
}

variable "lambda_function_names" {
  description = "Names of every Lambda function to create a log group for."
  type        = list(string)
}

variable "log_retention_in_days" {
  type = number
}

variable "dlq_name" {
  type = string
}
