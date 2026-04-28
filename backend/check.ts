import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const p = await prisma.proposta.findFirst({ where: { codigo: { contains: 'PROP-LEGADO-32' } } })
  console.log(p?.status)
}
main()
