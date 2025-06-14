import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function createSampleData() {
  console.log('Creating sample customers and jobs...')

  // Create sample customers
  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        firstName: 'John',
        lastName: 'Johnson',
        phone: '(555) 123-4567',
        email: 'john.johnson@email.com',
        address: '123 Main Street',
        city: 'Springfield',
        state: 'IL',
        zip: '62701',
      }
    }),
    prisma.customer.create({
      data: {
        companyName: 'Tech Solutions Inc',
        firstName: 'Sarah',
        lastName: 'Miller',
        phone: '(555) 234-5678',
        email: 'sarah@techsolutions.com',
        address: '456 Business Blvd',
        city: 'Springfield',
        state: 'IL',
        zip: '62702',
      }
    }),
    prisma.customer.create({
      data: {
        firstName: 'Mike',
        lastName: 'Davis',
        phone: '(555) 345-6789',
        email: 'mike.davis@email.com',
        address: '789 Oak Lane',
        city: 'Springfield',
        state: 'IL',
        zip: '62703',
      }
    }),
    prisma.customer.create({
      data: {
        companyName: 'Metro Office Complex',
        firstName: 'Lisa',
        lastName: 'Wilson',
        phone: '(555) 456-7890',
        email: 'facilities@metrooffice.com',
        address: '321 Downtown Plaza',
        city: 'Springfield',
        state: 'IL',
        zip: '62704',
      }
    }),
    prisma.customer.create({
      data: {
        firstName: 'Robert',
        lastName: 'Brown',
        phone: '(555) 567-8901',
        email: 'robert.brown@email.com',
        address: '654 Pine Road',
        city: 'Springfield',
        state: 'IL',
        zip: '62705',
      }
    }),
  ])

  console.log(`✅ Created ${customers.length} customers`)

  // Get users for job assignments
  const users = await prisma.user.findMany()
  const fieldUsers = users.filter(u => u.role === 'FIELD_CREW' || u.role === 'ADMIN')

  // Create sample jobs
  const jobs = []
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const nextWeek = new Date(now)
  nextWeek.setDate(nextWeek.getDate() + 7)

  // Job 1: In Progress
  const job1 = await prisma.job.create({
    data: {
      jobNumber: '25-001-001',
      customerId: customers[0].id,
      type: 'SERVICE_CALL',
      status: 'IN_PROGRESS',
      description: 'Electrical panel upgrade - 200 amp service',
      address: customers[0].address,
      city: customers[0].city,
      state: customers[0].state,
      zip: customers[0].zip,
      scheduledDate: now,
      estimatedHours: 8,
      estimatedCost: 2500,
      assignments: {
        create: fieldUsers.length > 0 ? [{
          userId: fieldUsers[0].id,
          assignedBy: users[0].id,
        }] : []
      }
    }
  })

  // Job 2: Scheduled
  const job2 = await prisma.job.create({
    data: {
      jobNumber: '25-002-001',
      customerId: customers[1].id,
      type: 'COMMERCIAL_PROJECT',
      status: 'SCHEDULED',
      description: 'Office buildout - new workstation wiring',
      address: customers[1].address,
      city: customers[1].city,
      state: customers[1].state,
      zip: customers[1].zip,
      scheduledDate: tomorrow,
      estimatedHours: 16,
      estimatedCost: 4800,
      assignments: {
        create: fieldUsers.length > 1 ? [{
          userId: fieldUsers[1].id,
          assignedBy: users[0].id,
        }] : []
      }
    }
  })

  // Job 3: Completed
  const job3 = await prisma.job.create({
    data: {
      jobNumber: '25-003-001',
      customerId: customers[2].id,
      type: 'SERVICE_CALL',
      status: 'COMPLETED',
      description: 'Outlet repair and GFCI installation',
      address: customers[2].address,
      city: customers[2].city,
      state: customers[2].state,
      zip: customers[2].zip,
      scheduledDate: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Yesterday
      completedDate: now,
      estimatedHours: 4,
      actualHours: 3.5,
      estimatedCost: 450,
      actualCost: 380,
      billedAmount: 520,
      billedDate: now,
    }
  })

  // Job 4: Estimate
  const job4 = await prisma.job.create({
    data: {
      jobNumber: '25-004-001',
      customerId: customers[3].id,
      type: 'COMMERCIAL_PROJECT',
      status: 'ESTIMATE',
      description: 'LED lighting retrofit for entire building',
      address: customers[3].address,
      city: customers[3].city,
      state: customers[3].state,
      zip: customers[3].zip,
      estimatedHours: 40,
      estimatedCost: 12000,
    }
  })

  // Job 5: Dispatched
  const job5 = await prisma.job.create({
    data: {
      jobNumber: '25-005-001',
      customerId: customers[4].id,
      type: 'SERVICE_CALL',
      status: 'DISPATCHED',
      description: 'Emergency service - power outage investigation',
      address: customers[4].address,
      city: customers[4].city,
      state: customers[4].state,
      zip: customers[4].zip,
      scheduledDate: now,
      estimatedHours: 2,
      estimatedCost: 250,
      assignments: {
        create: fieldUsers.length > 0 ? [{
          userId: fieldUsers[0].id,
          assignedBy: users[0].id,
        }] : []
      }
    }
  })

  jobs.push(job1, job2, job3, job4, job5)
  console.log(`✅ Created ${jobs.length} jobs`)

  // Create some time entries for completed and in-progress jobs
  if (fieldUsers.length > 0) {
    await prisma.timeEntry.create({
      data: {
        userId: fieldUsers[0].id,
        jobId: job3.id, // Completed job
        date: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        startTime: new Date(now.getTime() - 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000), // 8 AM yesterday
        endTime: new Date(now.getTime() - 24 * 60 * 60 * 1000 + 11.5 * 60 * 60 * 1000), // 11:30 AM yesterday
        hours: 3.5,
        description: 'Outlet repair and GFCI installation completed',
      }
    })

    await prisma.timeEntry.create({
      data: {
        userId: fieldUsers[0].id,
        jobId: job1.id, // In progress job
        date: now,
        startTime: new Date(now.getTime() - 4 * 60 * 60 * 1000), // 4 hours ago
        hours: 4,
        description: 'Panel upgrade work in progress',
      }
    })

    console.log('✅ Created time entries')
  }

  console.log('\n🎉 Sample data creation completed!')
  console.log('\nYou can now test the application with:')
  console.log('- 5 customers (mix of residential and commercial)')
  console.log('- 5 jobs in different statuses')
  console.log('- Time tracking entries')
  console.log('- Job assignments to crew members')
}

createSampleData()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })