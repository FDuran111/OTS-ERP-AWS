# Database Setup Instructions

## 1. Update Database URL

Replace the DATABASE_URL in `.env.local` with your Supabase connection string:

```
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
```

## 2. Generate Prisma Client

```bash
npm run db:generate
```

## 3. Push Schema to Database

This will create all the tables in your Supabase database:

```bash
npm run db:push
```

## 4. Seed Database (Optional)

To add initial data, first check if there's a seed file:

```bash
npm run db:seed
```

## 5. Test Login

After setup, you can login with the seeded user credentials.

## Troubleshooting

If you get connection errors:
- Make sure your Supabase project is active
- Check that the connection string is correct
- Ensure your IP is allowed in Supabase settings