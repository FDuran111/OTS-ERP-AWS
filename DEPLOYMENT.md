# Deployment Configuration

## Required Environment Variables

For production deployment, you need to set the following environment variables in your deployment platform (e.g., Coolify, Vercel, etc.):

### Database
```
DATABASE_URL=your_supabase_database_url
```

### Authentication
```
JWT_SECRET=your_jwt_secret
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=https://your-domain.com
```

### Supabase Configuration
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**Important**: The `SUPABASE_SERVICE_ROLE_KEY` is required for file uploads in production. Without it, file uploads will fail with permission errors.

### Optional - QuickBooks Integration
```
QB_CLIENT_ID=your_quickbooks_client_id
QB_CLIENT_SECRET=your_quickbooks_client_secret
QB_REDIRECT_URI=https://your-domain.com/api/quickbooks/callback
QB_SANDBOX_MODE=false
```

## File Storage

The application uses different storage backends based on the environment:

- **Development**: Local file storage in `./public/uploads/`
- **Production**: Supabase Storage (requires `SUPABASE_SERVICE_ROLE_KEY`)

### Setting up Supabase Storage

1. Get your service role key from Supabase Dashboard:
   - Go to Settings → API
   - Copy the `service_role` key (not the `anon` key)

2. Run the storage setup script after deployment:
   ```bash
   node scripts/setup-supabase-storage.js
   ```

This will create the necessary storage buckets in Supabase.

## Common Issues

### "EACCES: permission denied" error
This occurs when the `SUPABASE_SERVICE_ROLE_KEY` is not set in production. The app tries to use local storage but doesn't have write permissions in containerized environments.

### Files return 404 in production
Ensure that:
1. `SUPABASE_SERVICE_ROLE_KEY` is set
2. Storage buckets are created (run setup script)
3. Files are being uploaded to Supabase Storage, not local filesystem

## Coolify Specific Setup

In Coolify, add these environment variables:
1. Go to your application settings
2. Click on "Environment Variables"
3. Add each variable listed above
4. Make sure to click "Save" after adding all variables
5. Redeploy the application