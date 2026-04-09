import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const plainTextPassword = 'Nacional@2026';
  const newPassword = await bcrypt.hash(plainTextPassword, 10);
  console.log(`Setting new hashed password: ${newPassword} (for '${plainTextPassword}')`);
  
  const result = await prisma.user.updateMany({
    data: { password: newPassword }
  });
  
  console.log(`Updated ${result.count} users.`);

  // Verify
  const u = await prisma.user.findUnique({where:{email:'tainara@nacionalhidro.com.br'}});
  console.log('Verification match:', bcrypt.compareSync(plainTextPassword, u!.password));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
