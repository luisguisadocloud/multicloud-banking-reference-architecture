output "api_create_role_arn" {
  value = aws_iam_role.lambda["api-create"].arn
}

output "api_documents_role_arn" {
  value = aws_iam_role.lambda["api-documents"].arn
}

output "api_submit_role_arn" {
  value = aws_iam_role.lambda["api-submit"].arn
}

output "api_get_role_arn" {
  value = aws_iam_role.lambda["api-get"].arn
}

output "worker_evaluate_role_arn" {
  value = aws_iam_role.lambda["worker-evaluate"].arn
}

output "event_audit_role_arn" {
  value = aws_iam_role.lambda["event-audit"].arn
}

output "event_notification_role_arn" {
  value = aws_iam_role.lambda["event-notification"].arn
}

output "risk_engine_secret_arn" {
  value = aws_secretsmanager_secret.risk_engine_api_key.arn
}

output "risk_engine_secret_name" {
  value = aws_secretsmanager_secret.risk_engine_api_key.name
}
