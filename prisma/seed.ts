import { PrismaClient, UserRole } from '@prisma/client'
import { hashPassword } from '../src/lib/auth'

const prisma = new PrismaClient()

async function main() {
  // Create default users
  const users = [
    {
      email: 'tim@ortmeier.com',
      name: 'Tim Ortmeier',
      password: await hashPassword('admin123'),
      role: UserRole.ADMIN,
    },
    {
      email: 'derek@ortmeier.com',
      name: 'Derek',
      password: await hashPassword('admin123'),
      role: UserRole.ADMIN,
    },
    {
      email: 'rachel@ortmeier.com',
      name: 'Rachel',
      password: await hashPassword('office123'),
      role: UserRole.OFFICE,
    },
    {
      email: 'charisse@ortmeier.com',
      name: 'Charisse',
      password: await hashPassword('office123'),
      role: UserRole.OFFICE,
    },
    {
      email: 'crew1@ortmeier.com',
      name: 'Field Crew 1',
      password: await hashPassword('field123'),
      role: UserRole.FIELD_CREW,
    },
  ]

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: user,
    })
  }

  console.log('✅ Default users created')

  // Create default vendors
  const vendors = [
    {
      code: 'GRB',
      name: 'Graybar',
      contactName: 'Sales Department',
      phone: '555-0101',
      email: 'sales@graybar.com',
    },
    {
      code: 'CED',
      name: 'Consolidated Electrical Distributors',
      contactName: 'Account Manager',
      phone: '555-0102',
      email: 'orders@ced.com',
    },
    {
      code: 'WES',
      name: 'Wesco',
      contactName: 'Customer Service',
      phone: '555-0103',
      email: 'service@wesco.com',
    },
  ]

  for (const vendor of vendors) {
    await prisma.vendor.upsert({
      where: { code: vendor.code },
      update: {},
      create: vendor,
    })
  }

  console.log('✅ Default vendors created')

  // Create default labor rates
  const laborRates = [
    {
      name: 'Apprentice Electrician',
      description: 'Entry level electrician',
      hourlyRate: 45,
      skillLevel: 'APPRENTICE',
    },
    {
      name: 'Journeyman Electrician',
      description: 'Certified journeyman electrician',
      hourlyRate: 65,
      skillLevel: 'JOURNEYMAN',
    },
    {
      name: 'Master Electrician',
      description: 'Master electrician with full certification',
      hourlyRate: 85,
      skillLevel: 'MASTER',
    },
    {
      name: 'Service Call Rate',
      description: 'Standard service call rate',
      hourlyRate: 95,
      skillLevel: 'SERVICE',
    },
  ]

  for (const rate of laborRates) {
    await prisma.laborRate.create({
      data: rate,
    })
  }

  console.log('✅ Default labor rates created')

  // Create sample materials
  const graybar = await prisma.vendor.findUnique({ where: { code: 'GRB' } })
  
  const materials = [
    {
      code: 'WIRE-12-THHN',
      name: '12 AWG THHN Wire',
      description: '12 AWG THHN Stranded Copper Wire',
      unit: 'FT',
      cost: 0.45,
      price: 0.68,
      category: 'Wire',
      vendorId: graybar?.id,
      minStock: 1000,
    },
    {
      code: 'OUTLET-15A',
      name: '15A Duplex Outlet',
      description: 'Standard 15A duplex receptacle',
      unit: 'EA',
      cost: 2.50,
      price: 4.50,
      category: 'Devices',
      vendorId: graybar?.id,
      minStock: 50,
    },
    {
      code: 'BREAKER-20A-1P',
      name: '20A Single Pole Breaker',
      description: 'Square D 20A single pole circuit breaker',
      unit: 'EA',
      cost: 12.00,
      price: 24.00,
      category: 'Breakers',
      vendorId: graybar?.id,
      minStock: 20,
    },
  ]

  for (const material of materials) {
    await prisma.material.create({
      data: material,
    })
  }

  console.log('✅ Sample materials created')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })