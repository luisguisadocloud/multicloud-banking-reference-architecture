output "table_name" {
  value = aws_dynamodb_table.applications.name
}

output "table_arn" {
  value = aws_dynamodb_table.applications.arn
}

output "gsi_name" {
  value = "idempotencyKey-index"
}

output "gsi_arn" {
  description = "ARN of the idempotencyKey-index GSI, for IAM policies scoping GSI Query access."
  value       = "${aws_dynamodb_table.applications.arn}/index/idempotencyKey-index"
}
