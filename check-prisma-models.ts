import { PrismaClient } from './src/generated/prisma/client'
const p = new PrismaClient()
const keys = Object.keys(p).sort()
console.log(keys.join('\n'))
