output "bus_name" {
  value = aws_cloudwatch_event_bus.credit_application_events.name
}

output "bus_arn" {
  value = aws_cloudwatch_event_bus.credit_application_events.arn
}
