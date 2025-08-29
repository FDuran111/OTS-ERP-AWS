# ECS-ALB Infrastructure for OTS-ERP

This Terraform module provisions the production-ready infrastructure for the OTS-ERP application using AWS ECS Fargate with an Application Load Balancer, enabling secure deployment in private subnets while maintaining public accessibility through the ALB, effectively replacing the temporary Amplify deployment and allowing RDS to return to private-only access for enhanced security and scalability.

## Configuration

1. **Copy the example variables file:**
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```

2. **Edit `terraform.tfvars` with your VPC and subnet IDs**

3. **Find your AWS resources using these commands:**

   List VPCs with their IDs and Name tags:
   ```bash
   aws ec2 describe-vpcs --region us-east-2 \
     --query "Vpcs[].{VpcId:VpcId,Name:Tags[?Key=='Name']|[0].Value}" \
     --output table
   ```

   List subnets with details:
   ```bash
   aws ec2 describe-subnets --region us-east-2 \
     --query "Subnets[].{SubnetId:SubnetId,Az:AvailabilityZone,Name:Tags[?Key=='Name']|[0].Value,Public:MapPublicIpOnLaunch}" \
     --output table
   ```

4. **Initialize and apply:**
   ```bash
   terraform init
   terraform plan
   terraform apply
   ```