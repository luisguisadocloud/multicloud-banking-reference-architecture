# Custom EventBridge bus (see specs/002-aws-reference-implementation/research.md Decision 6) —
# only the bus lives here. The rule + targets live in the `compute` module because they need the
# audit/notification Lambda ARNs, which would otherwise create a dependency cycle between this
# module and `compute`.

resource "aws_cloudwatch_event_bus" "credit_application_events" {
  name = "${var.name_prefix}-credit-application-events"
  tags = var.tags
}
