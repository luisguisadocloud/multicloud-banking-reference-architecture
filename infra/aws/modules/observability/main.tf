# Explicit log group per Lambda (retention set, not left at "never expire" — docs/06) + the
# DLQ-depth alarm required by FR-011/SC-004.

resource "aws_cloudwatch_log_group" "lambda" {
  for_each          = toset(var.lambda_function_names)
  name              = "/aws/lambda/${each.value}"
  retention_in_days = var.log_retention_in_days
  tags              = var.tags
}

resource "aws_cloudwatch_metric_alarm" "evaluation_dlq_depth" {
  alarm_name        = "${var.name_prefix}-evaluation-dlq-depth"
  alarm_description = "Fires when any message lands in the evaluation dead-letter queue (FR-011, SC-004)."
  namespace         = "AWS/SQS"
  metric_name       = "ApproximateNumberOfMessagesVisible"
  dimensions = {
    QueueName = var.dlq_name
  }
  statistic           = "Maximum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 0
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"
  tags                = var.tags
}
