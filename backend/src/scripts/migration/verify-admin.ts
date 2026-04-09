import { PrismaClient } from '@prisma/client'
import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

const LEGACY = {
  host:     process.env.LEGACY_DB_HOST     || 'localhost',
  port:     parseInt(process.env.LEGACY_DB_PORT || '3306'),
  database: process.env.LEGACY_DB_NAME     || 'nhidro',
  user:     process.env.LEGACY_DB_USER     || 'root',
  password: process.env.LEGACY_DB_PASS     || '',
}

const prisma = new PrismaClient()

async function main() {
  console.log('--- Verificando Migração de Usuários Administrativos ---')
  
  const db = await mysql.createConnection(LEGACY)
  
  // 1. Buscar usuários administrativos no legado (roles que não são public)
  const [legacyUsers] = await db.query<any[]>(`
    SELECT u.id, u.username, u.email, r.name as role_name, u.url_signature
    FROM up_users u
    LEFT JOIN up_users_role_links url ON url.user_id = u.id
    LEFT JOIN up_roles r ON r.id = url.role_id
    WHERE r.type != 'public'
  `)
  
  console.log(`Logado: Encontrados ${legacyUsers.length} usuários administrativos no legado.`)
  
  // 2. Buscar usuários no novo sistema
  const modernUsers = await prisma.user.findMany()
  const modernEmails = new Set(modernUsers.map(u => u.email.toLowerCase()))
  
  console.log(`Moderno: Encontrados ${modernUsers.length} usuários no novo sistema.`)
  
  // 3. Comparar
  let missing = 0
  let noSignature = 0
  
  console.log('\n--- Detalhes por Usuário ---')
  for (const lu of legacyUsers) {
    const email = (lu.email || '').toLowerCase().trim()
    const exists = modernEmails.has(email)
    const modernUser = modernUsers.find(u => u.email.toLowerCase() === email)
    
    if (!exists) {
      console.log(`❌ [AUSENTE] ${lu.username} (${email}) - Role: ${lu.role_name}`)
      missing++
    } else {
      const hasSignature = !!modernUser?.signatureUrl
      const legacyHasSignature = !!lu.url_signature
      
      if (legacyHasSignature && !hasSignature) {
        console.log(`⚠️ [SEM ASSINATURA] ${lu.username} (${email}) - Role: ${lu.role_name} (Tem no legado: ${lu.url_signature})`)
        noSignature++
      } else {
        console.log(`✅ [OK] ${lu.username} (${email}) - Role: ${lu.role_name}${hasSignature ? ' (Assinatura OK)' : ''}`)
      }
    }
  }
  
  console.log('\n--- Resumo Final ---')
  console.log(`Total Legado (Admin): ${legacyUsers.length}`)
  console.log(`Migrados Corretamente: ${legacyUsers.length - missing}`)
  console.log(`Ausentes no Novo: ${missing}`)
  console.log(`Pendente Sincronizar Assinaturas: ${noSignature}`)
  
  if (missing === 0 && noSignature === 0) {
    console.log('\n🎉 PARIDADE TOTAL ATINGIDA!')
  } else {
    console.log('\n⚠️ Pendências encontradas. Execute o script de migração atualizado para sincronizar.')
  }

  await db.end()
  await prisma.$disconnect()
}

main().catch(console.error)
