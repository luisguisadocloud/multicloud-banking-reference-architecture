# Least-privilege IAM: one role per Lambda, each policy scoped to exactly the actions/resources
# that Lambda's adapter code calls. See
# specs/002-aws-reference-implementation/data-model.md's IAM table and research.md Decision 8.
# Also owns the fictitious RISK_ENGINE_API_KEY secret (T045) — bundled here because access to it
# is itself a least-privilege/identity concern (only worker-evaluate's role may read it).

locals {
  lambda_names = [
    "api-create",
    "api-documents",
    "api-submit",
    "api-get",
    "worker-evaluate",
    "event-audit",
    "event-notification",
  ]
}

data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda" {
  for_each           = toset(local.lambda_names)
  name               = "${var.name_prefix}-${each.key}"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
  tags               = var.tags
}

# CloudWatch Logs for every Lambda (FR-010) — the one permission all 7 roles share.
resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  for_each   = aws_iam_role.lambda
  role       = each.value.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# --- Fictitious secret, practiced end-to-end only by worker-evaluate ---

resource "aws_secretsmanager_secret" "risk_engine_api_key" {
  name = "${var.name_prefix}-risk-engine-api-key"
  tags = var.tags

  # This is a lab secret with a fictitious value (line below), destroyed and recreated often
  # during iteration. Skip AWS's default 30-day recovery window so re-applying doesn't collide
  # with a secret still "scheduled for deletion" from a prior destroy.
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "risk_engine_api_key" {
  secret_id     = aws_secretsmanager_secret.risk_engine_api_key.id
  secret_string = jsonencode({ apiKey = "fictitious-lab-value-not-a-real-credential" })
}

# --- Per-Lambda scoped policies ---

data "aws_iam_policy_document" "api_create" {
  statement {
    sid       = "DynamoDbCreateApplication"
    actions   = ["dynamodb:PutItem"]
    resources = [var.dynamodb_table_arn]
  }
  statement {
    sid       = "DynamoDbFindByIdempotencyKey"
    actions   = ["dynamodb:Query"]
    resources = [var.dynamodb_gsi_arn]
  }
}

resource "aws_iam_role_policy" "api_create" {
  name   = "${var.name_prefix}-api-create-policy"
  role   = aws_iam_role.lambda["api-create"].id
  policy = data.aws_iam_policy_document.api_create.json
}

data "aws_iam_policy_document" "api_documents" {
  statement {
    sid       = "DynamoDbReadAndAttachDocument"
    actions   = ["dynamodb:GetItem", "dynamodb:PutItem"]
    resources = [var.dynamodb_table_arn]
  }
  statement {
    # Presigning delegates real authorization to this role: without s3:PutObject here, the
    # generated presigned URL would be rejected by S3 when the client tries to upload.
    sid       = "S3PresignUpload"
    actions   = ["s3:PutObject"]
    resources = ["${var.s3_bucket_arn}/*"]
  }
}

resource "aws_iam_role_policy" "api_documents" {
  name   = "${var.name_prefix}-api-documents-policy"
  role   = aws_iam_role.lambda["api-documents"].id
  policy = data.aws_iam_policy_document.api_documents.json
}

data "aws_iam_policy_document" "api_submit" {
  statement {
    sid       = "DynamoDbReadAndTransition"
    actions   = ["dynamodb:GetItem", "dynamodb:PutItem"]
    resources = [var.dynamodb_table_arn]
  }
  statement {
    sid       = "SqsEnqueueEvaluation"
    actions   = ["sqs:SendMessage"]
    resources = [var.sqs_queue_arn]
  }
}

resource "aws_iam_role_policy" "api_submit" {
  name   = "${var.name_prefix}-api-submit-policy"
  role   = aws_iam_role.lambda["api-submit"].id
  policy = data.aws_iam_policy_document.api_submit.json
}

data "aws_iam_policy_document" "api_get" {
  statement {
    sid       = "DynamoDbReadApplication"
    actions   = ["dynamodb:GetItem"]
    resources = [var.dynamodb_table_arn]
  }
}

resource "aws_iam_role_policy" "api_get" {
  name   = "${var.name_prefix}-api-get-policy"
  role   = aws_iam_role.lambda["api-get"].id
  policy = data.aws_iam_policy_document.api_get.json
}

data "aws_iam_policy_document" "worker_evaluate" {
  statement {
    sid       = "DynamoDbReadAndRecordDecision"
    actions   = ["dynamodb:GetItem", "dynamodb:PutItem"]
    resources = [var.dynamodb_table_arn]
  }
  statement {
    sid       = "SqsConsumeEvaluationQueue"
    actions   = ["sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:GetQueueAttributes"]
    resources = [var.sqs_queue_arn]
  }
  statement {
    sid       = "EventBridgePublishApplicationEvaluated"
    actions   = ["events:PutEvents"]
    resources = [var.eventbridge_bus_arn]
  }
  statement {
    sid       = "SecretsManagerReadRiskEngineKey"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [aws_secretsmanager_secret.risk_engine_api_key.arn]
  }
}

resource "aws_iam_role_policy" "worker_evaluate" {
  name   = "${var.name_prefix}-worker-evaluate-policy"
  role   = aws_iam_role.lambda["worker-evaluate"].id
  policy = data.aws_iam_policy_document.worker_evaluate.json
}

# event-audit and event-notification need no permissions beyond CloudWatch Logs (already attached
# above) — they only read the EventBridge-delivered payload and log it.
