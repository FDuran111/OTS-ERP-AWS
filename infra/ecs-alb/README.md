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

4. **Initialize and plan infrastructure:**
   ```bash
   terraform init
   terraform plan -out=tfplan
   ```
   
   **Wait for approval before applying!**

5. **After approval, apply the infrastructure:**
   ```bash
   terraform apply tfplan
   ```

## Deployment

After infrastructure is created:

1. **Build and push Docker image to ECR:**
   ```bash
   bash scripts/build-push.sh us-east-2 ots-erp/app
   ```

2. **Deploy to ECS:**
   ```bash
   bash scripts/deploy-ecs.sh us-east-2 ots-erp-cluster ots-erp-svc
   ```

3. **Verify deployment:**
   ```bash
   # Get the ALB DNS name
   ALB_DNS=$(terraform output -raw alb_dns_name)
   
   # Check health endpoint
   curl http://${ALB_DNS}/api/healthz
   ```

## Outputs

After applying, you can access these outputs:

- `terraform output alb_dns_name` - Application Load Balancer URL
- `terraform output ecr_repo_url` - ECR repository URL for Docker images
- `terraform output ecs_cluster_name` - ECS cluster name
- `terraform output ecs_service_name` - ECS service name