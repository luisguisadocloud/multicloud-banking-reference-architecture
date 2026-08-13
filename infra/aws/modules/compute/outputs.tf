output "api_create_function_name" {
  value = aws_lambda_function.this["api-create"].function_name
}

output "api_create_invoke_arn" {
  value = aws_lambda_function.this["api-create"].invoke_arn
}

output "api_documents_function_name" {
  value = aws_lambda_function.this["api-documents"].function_name
}

output "api_documents_invoke_arn" {
  value = aws_lambda_function.this["api-documents"].invoke_arn
}

output "api_submit_function_name" {
  value = aws_lambda_function.this["api-submit"].function_name
}

output "api_submit_invoke_arn" {
  value = aws_lambda_function.this["api-submit"].invoke_arn
}

output "api_get_function_name" {
  value = aws_lambda_function.this["api-get"].function_name
}

output "api_get_invoke_arn" {
  value = aws_lambda_function.this["api-get"].invoke_arn
}

output "all_function_names" {
  description = "Every Lambda function name — consumed by the observability module for log groups."
  value       = [for k, fn in aws_lambda_function.this : fn.function_name]
}
