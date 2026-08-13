# HTTP API (research.md Decision 1) fronting the 4 operations defined in
# openapi/credit-application-api.yaml. AWS_PROXY integration — the Lambda handlers themselves
# implement the response shape the OpenAPI contract requires, so no request/response mapping
# templates are needed here.

resource "aws_apigatewayv2_api" "http_api" {
  name          = "${var.name_prefix}-api"
  protocol_type = "HTTP"
  tags          = var.tags
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.http_api.id
  name        = "$default"
  auto_deploy = true
  tags        = var.tags
}

locals {
  routes = {
    "POST /applications" = {
      lambda_arn  = var.api_create_lambda_arn
      lambda_name = var.api_create_lambda_name
    }
    "POST /applications/{applicationId}/documents" = {
      lambda_arn  = var.api_documents_lambda_arn
      lambda_name = var.api_documents_lambda_name
    }
    "POST /applications/{applicationId}/submit" = {
      lambda_arn  = var.api_submit_lambda_arn
      lambda_name = var.api_submit_lambda_name
    }
    "GET /applications/{applicationId}" = {
      lambda_arn  = var.api_get_lambda_arn
      lambda_name = var.api_get_lambda_name
    }
  }
}

resource "aws_apigatewayv2_integration" "lambda" {
  for_each               = local.routes
  api_id                 = aws_apigatewayv2_api.http_api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = each.value.lambda_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "this" {
  for_each  = local.routes
  api_id    = aws_apigatewayv2_api.http_api.id
  route_key = each.key
  target    = "integrations/${aws_apigatewayv2_integration.lambda[each.key].id}"
}

resource "aws_lambda_permission" "apigateway_invoke" {
  for_each      = local.routes
  statement_id  = "AllowAPIGatewayInvoke${replace(each.key, "/[^a-zA-Z0-9]/", "")}"
  action        = "lambda:InvokeFunction"
  function_name = each.value.lambda_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http_api.execution_arn}/*/*"
}
