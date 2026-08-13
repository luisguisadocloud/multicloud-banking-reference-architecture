variable "name_prefix" {
  description = "Prefix applied to every resource name in this module."
  type        = string
}

variable "tags" {
  description = "Tags applied to every resource in this module."
  type        = map(string)
  default     = {}
}

variable "max_receive_count" {
  description = "SQS redrive policy maxReceiveCount before a message moves to the DLQ (FR-006)."
  type        = number
}
