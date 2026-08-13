# 7 Lambda functions, one per responsibility (research.md Decision 3). This module also owns:
# - the SQS event-source-mapping for worker-evaluate
# - the EventBridge rule + targets for event-audit/event-notification
# because both need the Lambda ARNs created here — putting them in `messaging`/`events` would
# create a dependency cycle (see comment in modules/events/main.tf).
#
# Zip artifacts are expected at ../../../../dist-lambda/<dir>/ — run `npm run build:lambda`
# (esbuild bundle, see scripts/build-lambda.mjs) before `terraform plan`/`apply`.

locals {
  common_env = {
    TABLE_NAME             = var.dynamodb_table_name
    IDEMPOTENCY_INDEX_NAME = var.dynamodb_gsi_name
  }

  lambdas = {
    "api-create" = {
      dir      = "apiCreateApplication"
      role_arn = var.api_create_role_arn
      timeout  = 10
      env      = local.common_env
    }
    "api-documents" = {
      dir      = "apiAuthorizeDocumentUpload"
      role_arn = var.api_documents_role_arn
      timeout  = 10
      env      = merge(local.common_env, { BUCKET_NAME = var.s3_bucket_name })
    }
    "api-submit" = {
      dir      = "apiSubmitApplication"
      role_arn = var.api_submit_role_arn
      timeout  = 10
      env      = merge(local.common_env, { QUEUE_URL = var.sqs_queue_url })
    }
    "api-get" = {
      dir      = "apiGetApplication"
      role_arn = var.api_get_role_arn
      timeout  = 10
      env      = local.common_env
    }
    "worker-evaluate" = {
      dir      = "workerEvaluateApplication"
      role_arn = var.worker_evaluate_role_arn
      timeout  = 30
      env = merge(local.common_env, {
        EVENT_BUS_NAME = var.eventbridge_bus_name
        SECRET_ARN     = var.secrets_manager_secret_arn
      })
    }
    "event-audit" = {
      dir      = "eventAuditHandler"
      role_arn = var.event_audit_role_arn
      timeout  = 10
      env      = {}
    }
    "event-notification" = {
      dir      = "eventNotificationHandler"
      role_arn = var.event_notification_role_arn
      timeout  = 10
      env      = {}
    }
  }
}

data "archive_file" "lambda" {
  for_each    = local.lambdas
  type        = "zip"
  source_dir  = "${path.module}/../../../../dist-lambda/${each.value.dir}"
  output_path = "${path.module}/../../../../dist-lambda/${each.value.dir}.zip"
}

resource "aws_lambda_function" "this" {
  for_each         = local.lambdas
  function_name    = "${var.name_prefix}-${each.key}"
  filename         = data.archive_file.lambda[each.key].output_path
  source_code_hash = data.archive_file.lambda[each.key].output_base64sha256
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  role             = each.value.role_arn
  timeout          = each.value.timeout
  memory_size      = 256
  tags             = var.tags

  environment {
    variables = each.value.env
  }
}

# --- worker-evaluate consumes the evaluation queue ---

resource "aws_lambda_event_source_mapping" "worker_evaluate_sqs" {
  event_source_arn        = var.sqs_queue_arn
  function_name           = aws_lambda_function.this["worker-evaluate"].arn
  batch_size              = 10
  function_response_types = ["ReportBatchItemFailures"]
}

# --- event-audit / event-notification consume ApplicationEvaluated from the custom bus ---

resource "aws_cloudwatch_event_rule" "application_evaluated" {
  name           = "${var.name_prefix}-application-evaluated"
  event_bus_name = var.eventbridge_bus_name
  event_pattern = jsonencode({
    "detail-type" = ["ApplicationEvaluated"]
  })
  tags = var.tags
}

resource "aws_cloudwatch_event_target" "audit" {
  rule           = aws_cloudwatch_event_rule.application_evaluated.name
  event_bus_name = var.eventbridge_bus_name
  target_id      = "event-audit"
  arn            = aws_lambda_function.this["event-audit"].arn
}

resource "aws_cloudwatch_event_target" "notification" {
  rule           = aws_cloudwatch_event_rule.application_evaluated.name
  event_bus_name = var.eventbridge_bus_name
  target_id      = "event-notification"
  arn            = aws_lambda_function.this["event-notification"].arn
}

resource "aws_lambda_permission" "eventbridge_invoke_audit" {
  statement_id  = "AllowEventBridgeInvokeAudit"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.this["event-audit"].function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.application_evaluated.arn
}

resource "aws_lambda_permission" "eventbridge_invoke_notification" {
  statement_id  = "AllowEventBridgeInvokeNotification"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.this["event-notification"].function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.application_evaluated.arn
}
