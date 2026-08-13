# Standard SQS queue (not FIFO — see specs/002-aws-reference-implementation/research.md
# Decision 2) + its dead-letter queue.

resource "aws_sqs_queue" "evaluation_dlq" {
  name = "${var.name_prefix}-evaluation-queue-dlq"
  tags = var.tags
}

resource "aws_sqs_queue" "evaluation_queue" {
  name                       = "${var.name_prefix}-evaluation-queue"
  visibility_timeout_seconds = 60
  tags                       = var.tags

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.evaluation_dlq.arn
    maxReceiveCount     = var.max_receive_count
  })
}
