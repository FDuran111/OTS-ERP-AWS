const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('Starting simple seed...')
  
  try {
    // Create a simple vendor first
    await prisma.vendor.upsert({
      where: { code: 'GRB' },
      update: {},
      create: {
        code: 'GRB',
        name: 'Graybar',
        contactName: 'Sales Department',
        phone: '555-0101',
        email: 'sales@graybar.com',
      }
    })
    console.log('✅ Vendor created')

    // Create simple materials
    const materials = [
      {
        code: 'WIRE-12-THHN',
        name: '12 AWG THHN Wire',
        description: '12 AWG THHN Stranded Copper Wire',
        manufacturer: 'Square D',
        unit: 'ft',
        cost: 0.45,
        price: 0.68,
        category: 'Wire',
        minStock: 1000,
        inStock: 500,
      },
      {
        code: 'OUTLET-15A',
        name: '15A Duplex Outlet',
        description: 'Standard 15A duplex receptacle',
        manufacturer: 'Leviton',
        unit: 'each',
        cost: 2.50,
        price: 4.50,
        category: 'Devices',
        minStock: 50,
        inStock: 25,
      },
      {
        code: 'BREAKER-20A-1P',
        name: '20A Single Pole Breaker',
        description: 'Square D 20A single pole circuit breaker',
        manufacturer: 'Square D',
        unit: 'each',
        cost: 12.00,
        price: 24.00,
        category: 'Breakers',
        minStock: 20,
        inStock: 15,
      },
    ]

    for (const material of materials) {
      await prisma.material.upsert({
        where: { code: material.code },
        update: {},
        create: material,
      })
    }
    console.log('✅ Materials created')
    
    // Create a simple customer
    await prisma.customer.upsert({
      where: { email: 'test@example.com' },
      update: {},
      create: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'test@example.com',
        phone: '555-0123',
        companyName: 'Test Company',
        address: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zipCode: '12345',
        type: 'RESIDENTIAL',
      }
    })
    console.log('✅ Customer created')

    console.log('🎉 Simple seed completed successfully!')
    
  } catch (error) {
    console.error('❌ Error in simple seed:', error)
    throw error
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })