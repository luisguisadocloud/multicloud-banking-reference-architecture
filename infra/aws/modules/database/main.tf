# DynamoDB single-table design per specs/002-aws-reference-implementation/data-model.md.
# On-demand billing (PAY_PER_REQUEST): this lab has unpredictable, low, bursty traffic and gets
# destroyed/recreated repeatedly — provisioned capacity would either throttle or waste money.

resource "aws_dynamodb_table" "applications" {
  name         = "${var.name_prefix}-credit-applications"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "applicationId"

  attribute {
    name = "applicationId"
    type = "S"
  }

  attribute {
    name = "idempotencyKey"
    type = "S"
  }

  global_secondary_index {
    name            = "idempotencyKey-index"
    hash_key        = "idempotencyKey"
    projection_type = "ALL"
  }

  tags = var.tags
}
