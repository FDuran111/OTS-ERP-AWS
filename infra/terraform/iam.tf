data "aws_caller_identity" "current" {}

# Execution role for the app (Amplify/ECS/etc.) to access the bucket
resource "aws_iam_role" "app_role" {
  name               = "${var.project_name}-${var.env}-app-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = [
          "amplify.amazonaws.com",
          "ecs-tasks.amazonaws.com",
          "lambda.amazonaws.com"
        ]
      }
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_policy" "app_s3_policy" {
  name   = "${var.project_name}-${var.env}-s3-policy"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid: "BucketObjectsRW",
        Effect: "Allow",
        Action: ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
        Resource = "arn:aws:s3:::${aws_s3_bucket.uploads.bucket}/*"
      },
      {
        Sid: "BucketList",
        Effect: "Allow",
        Action: ["s3:ListBucket"],
        Resource = "arn:aws:s3:::${aws_s3_bucket.uploads.bucket}"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "attach_app_s3" {
  role       = aws_iam_role.app_role.name
  policy_arn = aws_iam_policy.app_s3_policy.arn
}