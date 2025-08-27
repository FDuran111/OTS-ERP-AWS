locals {
  bucket_name = length(var.s3_bucket_name) > 0 ? var.s3_bucket_name : "${var.project_name}-${var.env}-uploads"
}

resource "aws_s3_bucket" "uploads" {
  bucket = local.bucket_name

  tags = {
    Project = var.project_name
    Env     = var.env
  }
}

resource "aws_s3_bucket_versioning" "uploads" {
  bucket = aws_s3_bucket.uploads.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_public_access_block" "uploads" {
  bucket                  = aws_s3_bucket.uploads.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id
  rule {
    id = "expire-mpu"
    status = "Enabled"
    abort_incomplete_multipart_upload { days_after_initiation = 7 }
  }
}

resource "aws_s3_bucket_cors_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id
  cors_rule {
    allowed_methods = ["GET", "PUT"]
    allowed_origins = ["*"]       # tighten later with your app domain(s)
    allowed_headers = ["*"]
    max_age_seconds = 300
  }
}