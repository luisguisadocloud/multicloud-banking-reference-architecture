output "log_group_names" {
  value = { for name, lg in aws_cloudwatch_log_group.lambda : name => lg.name }
}

output "alarm_arn" {
  value = aws_cloudwatch_metric_alarm.evaluation_dlq_depth.arn
}
