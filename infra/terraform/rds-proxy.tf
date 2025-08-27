resource "aws_db_proxy" "rds_proxy" {
  name                   = "${var.project_name}-${var.env}-rds-proxy"
  engine_family          = "POSTGRESQL"
  idle_client_timeout    = 1800
  require_tls            = true
  role_arn               = aws_iam_role.app_role.arn
  vpc_security_group_ids = [aws_security_group.rds_sg.id]
  vpc_subnet_ids         = var.subnet_ids
}

resource "aws_db_proxy_default_target_group" "default" {
  db_proxy_name = aws_db_proxy.rds_proxy.name

  connection_pool_config {
    max_connections_percent        = 90
    max_idle_connections_percent   = 50
    connection_borrow_timeout      = 120
  }
}

resource "aws_db_proxy_target" "rds_target" {
  db_proxy_name = aws_db_proxy.rds_proxy.name
  target_group_name = aws_db_proxy_default_target_group.default.name
  db_instance_identifier = aws_db_instance.postgres.id
}

resource "aws_db_proxy_endpoint" "readwrite" {
  db_proxy_name = aws_db_proxy.rds_proxy.name
  db_proxy_endpoint_name = "${var.project_name}-${var.env}-proxy-endpoint"
  vpc_subnet_ids         = var.subnet_ids
  vpc_security_group_ids = [aws_security_group.rds_sg.id]
}