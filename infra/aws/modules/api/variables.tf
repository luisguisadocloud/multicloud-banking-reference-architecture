variable "name_prefix" {
  description = "Prefix applied to every resource name in this module."
  type        = string
}

variable "tags" {
  description = "Tags applied to every resource in this module."
  type        = map(string)
  default     = {}
}

variable "api_create_lambda_arn" {
  type = string
}

variable "api_create_lambda_name" {
  type = string
}

variable "api_documents_lambda_arn" {
  type = string
}

variable "api_documents_lambda_name" {
  type = string
}

variable "api_submit_lambda_arn" {
  type = string
}

variable "api_submit_lambda_name" {
  type = string
}

variable "api_get_lambda_arn" {
  type = string
}

variable "api_get_lambda_name" {
  type = string
}
