resource "aws_db_subnet_group" "rds_subnet_group" {
  name       = "${var.project_name}-${var.env}-rds-subnets"
  subnet_ids = local.subnet_ids

  tags = { Project = var.project_name, Env = var.env }
}

resource "aws_db_parameter_group" "postgres" {
  name        = "${var.project_name}-${var.env}-pg-params"
  family      = "postgres16"
  description = "Custom parameter group for Postgres"

  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }

  tags = { Project = var.project_name, Env = var.env }
}