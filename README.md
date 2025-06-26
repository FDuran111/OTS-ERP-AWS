# Ortmeier Technical Service - Job Management Platform

A comprehensive job management and scheduling platform designed for electrical subcontractors.

## Features

- **Job Management**: Structured job numbering (YY-###-SSS format) with phase tracking
- **User Roles**: Admin (Tim/Derek), Office (Rachel/Charisse), Field Crews
- **Service Call Workflow**: Intake → Dispatch → Billing
- **Commercial Projects**: Multi-phase tracking with purchase orders
- **Time Tracking**: Mobile-friendly interface with GPS verification
- **Material Management**: Catalog with vendor integration
- **QuickBooks Integration**: Sync customers, jobs, and time entries
- **Visual Scheduling**: Drag-and-drop job assignment

## Setup Instructions

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- npm or yarn

### Installation

1. Clone the repository and navigate to the project:
```bash
cd ortmeier-job-management
```

2. Install dependencies:
```bash
npm install
```

3. Set up your PostgreSQL database and update `.env.local`:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/ortmeier_jobs"
JWT_SECRET="your-secret-key-here"
NEXTAUTH_SECRET="your-nextauth-secret-here"
```

4. Push the database schema:
```bash
npm run db:push
```

5. Seed the database with initial data:
```bash
npm run db:seed
```

6. Start the development server:
```bash
npm run dev
```

7. Access the application at http://localhost:3000

### Default Users

- **Admin**: tim@ortmeier.com / admin123
- **Admin**: derek@ortmeier.com / admin123  
- **Office**: rachel@ortmeier.com / office123
- **Office**: charisse@ortmeier.com / office123
- **Field**: crew1@ortmeier.com / field123

## Project Structure

```
src/
├── app/              # Next.js app router pages
├── components/       # React components
│   ├── ui/          # UI components
│   └── layout/      # Layout components
├── lib/             # Utility functions
│   ├── auth.ts      # Authentication utilities
│   ├── prisma.ts    # Database client
│   └── job-numbering.ts # Job number generation
└── middleware.ts    # Authentication middleware
```

## Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: JWT with HTTP-only cookies
- **UI Components**: Radix UI, Lucide Icons

## Development Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run db:studio    # Open Prisma Studio
npm run db:push      # Push schema changes
npm run db:generate  # Generate Prisma client
```

## Next Steps

1. Complete service call workflow implementation
2. Build mobile time tracking interface
3. Implement QuickBooks OAuth and API integration
4. Create drag-and-drop scheduling board
5. Add material catalog management