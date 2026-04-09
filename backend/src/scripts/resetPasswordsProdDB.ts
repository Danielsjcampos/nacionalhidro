import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://neondb_owner:npg_fRoHJYqn1jk5@ep-ancient-union-acm8qdvg-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
    }
  }
});

async function main() {
  const plainTextPassword = 'Nacional@2026';
  const newPassword = await bcrypt.hash(plainTextPassword, 10);
  console.log(`Setting new hashed password: ${newPassword} (for '${plainTextPassword}')`);
  
  const result = await prisma.user.updateMany({
    data: { password: newPassword }
  });
  
  console.log(`Updated ${result.count} users in ep-ancient-union.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
