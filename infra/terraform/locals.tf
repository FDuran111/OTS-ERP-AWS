locals {
  # Resolve VPC and subnet IDs based on whether we're creating a new VPC
  vpc_id     = var.create_vpc ? module.vpc.vpc_id : var.vpc_id
  subnet_ids = var.create_vpc ? module.vpc.private_subnets : var.subnet_ids
}