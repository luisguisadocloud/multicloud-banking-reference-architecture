# Private S3 bucket for uploaded documents (docs/architecture/03-aws.md: private bucket, presigned
# upload, block public access). Bucket names must be globally unique, so the account ID is folded
# into the name rather than pulling in the `random` provider for a lab-scale need.

data "aws_caller_identity" "current" {}

resource "aws_s3_bucket" "documents" {
  bucket = "${var.name_prefix}-documents-${data.aws_caller_identity.current.account_id}"
  tags   = var.tags
}

resource "aws_s3_bucket_public_access_block" "documents" {
  bucket = aws_s3_bucket.documents.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "documents" {
  bucket = aws_s3_bucket.documents.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}
