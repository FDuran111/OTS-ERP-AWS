# Placeholders for Secrets Manager ARNs; you will put values after apply via CLI.

resource "aws_secretsmanager_secret" "rds_user" {
  name = "${var.project_name}/${var.env}/rds/user"
}

resource "aws_secretsmanager_secret" "rds_password" {
  name = "${var.project_name}/${var.env}/rds/password"
}

resource "aws_secretsmanager_secret" "jwt_secret" {
  name = "${var.project_name}/${var.env}/jwt/secret"
}

# Optional: create empty initial versions (safe placeholders)
resource "aws_secretsmanager_secret_version" "jwt_secret_init" {
  count         = var.create_placeholder_secrets ? 1 : 0
  secret_id     = aws_secretsmanager_secret.jwt_secret.id
  secret_string = "REPLACE_ME"
}