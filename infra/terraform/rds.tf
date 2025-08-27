variable "db_instance_class" { type = string default = "db.t4g.medium" }
variable "db_allocated_storage" { type = number default = 50 }
variable "db_name" { type = string default = "ortmeier" }
variable "db_username" { type = string default = "otsapp" }
variable "db_engine_version" { type = string default = "16.3" }

# Security group for RDS (will only allow app role SG later)
resource "aws_security_group" "rds_sg" {
  name        = "${var.project_name}-${var.env}-rds-sg"
  description = "RDS security group"
  vpc_id      = var.vpc_id

  tags = { Project = var.project_name, Env = var.env }
}

resource "aws_db_instance" "postgres" {
  identifier        = "${var.project_name}-${var.env}-rds"
  engine            = "postgres"
  engine_version    = var.db_engine_version
  instance_class    = var.db_instance_class
  allocated_storage = var.db_allocated_storage

  db_name  = var.db_name
  username = var.db_username
  password = random_password.db_password.result

  db_subnet_group_name   = aws_db_subnet_group.rds_subnet_group.name
  vpc_security_group_ids = [aws_security_group.rds_sg.id]
  skip_final_snapshot    = true

  publicly_accessible = false

  tags = { Project = var.project_name, Env = var.env }
}

resource "random_password" "db_password" {
  length           = 20
  special          = false
  override_characters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
}

# Store password in Secrets Manager
resource "aws_secretsmanager_secret_version" "rds_password_value" {
  secret_id     = aws_secretsmanager_secret.rds_password.id
  secret_string = random_password.db_password.result
}