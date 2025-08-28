module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  create_vpc = var.create_vpc

  name = "${var.project_name}-${var.env}-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["us-east-2a", "us-east-2b"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = true
  enable_dns_hostnames = true
  enable_dns_support   = true

  # Tags for all resources
  tags = {
    Project     = var.project_name
    Environment = var.env
    Terraform   = "true"
  }

  # Tags for subnets
  public_subnet_tags = {
    Name = "${var.project_name}-${var.env}-public"
    Type = "public"
  }

  private_subnet_tags = {
    Name = "${var.project_name}-${var.env}-private"
    Type = "private"
  }

  # Tags for route tables
  public_route_table_tags = {
    Name = "${var.project_name}-${var.env}-public-rt"
  }

  private_route_table_tags = {
    Name = "${var.project_name}-${var.env}-private-rt"
  }

  # NAT Gateway tags
  nat_gateway_tags = {
    Name = "${var.project_name}-${var.env}-nat"
  }

  # Internet Gateway tags
  igw_tags = {
    Name = "${var.project_name}-${var.env}-igw"
  }

  # VPC tags
  vpc_tags = {
    Name = "${var.project_name}-${var.env}-vpc"
  }
}