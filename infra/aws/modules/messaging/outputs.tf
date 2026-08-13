output "queue_url" {
  value = aws_sqs_queue.evaluation_queue.url
}

output "queue_arn" {
  value = aws_sqs_queue.evaluation_queue.arn
}

output "dlq_url" {
  value = aws_sqs_queue.evaluation_dlq.url
}

output "dlq_arn" {
  value = aws_sqs_queue.evaluation_dlq.arn
}

output "dlq_name" {
  value = aws_sqs_queue.evaluation_dlq.name
}
