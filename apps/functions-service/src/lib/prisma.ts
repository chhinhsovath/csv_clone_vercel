import { PrismaClient } from '@prisma/client'

export const prisma = new PrismaClient({
  errorFormat: 'pretty',
})

// Ensure Prisma connects to database
prisma.$connect().catch((error) => {
  console.error('Failed to connect to database:', error)
  process.exit(1)
})

export default prisma
