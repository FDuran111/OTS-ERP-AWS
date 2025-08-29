# Separate security group for RDS Proxy
resource "aws_security_group" "proxy_sg" {
  name        = "${var.project_name}-${var.env}-proxy-sg"
  description = "Security group for RDS Proxy"
  vpc_id      = local.vpc_id

  # No inbound rules needed - clients connect via ENI
  
  # Allow all egress
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.project_name}-${var.env}-proxy-sg"
    Environment = var.env
  }
}

# Update RDS security group to only allow from proxy
resource "aws_security_group_rule" "rds_from_proxy" {
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = aws_security_group.rds_sg.id
  source_security_group_id = aws_security_group.proxy_sg.id
  description              = "PostgreSQL from RDS Proxy"
}