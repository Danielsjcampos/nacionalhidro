import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de Usuários e Permissões...\n');

  // ═══════════════════════════════════════════════════════════
  // CATEGORIAS DE PERMISSÃO
  // ═══════════════════════════════════════════════════════════

  const categorias = [
    {
      nome: 'Master',
      canAccessFinanceiro: true, canAccessContasPagar: true, canAccessContasReceber: true,
      canAccessCobranca: true, canAccessFaturamento: true, canAccessLogistica: true,
      canAccessOperacao: true, canAccessMedicoes: true, canAccessManutencao: true,
      canAccessFrota: true, canAccessEstoque: true, canAccessComercial: true,
      canAccessRH: true, canAccessDP: true,
    },
    {
      nome: 'Financeiro',
      canAccessFinanceiro: true, canAccessContasPagar: true, canAccessContasReceber: true,
      canAccessCobranca: true, canAccessFaturamento: true, canAccessLogistica: false,
      canAccessOperacao: false, canAccessMedicoes: false, canAccessManutencao: false,
      canAccessFrota: false, canAccessEstoque: false, canAccessComercial: false,
      canAccessRH: false, canAccessDP: false,
    },
    {
      nome: 'Operações',
      canAccessFinanceiro: false, canAccessContasPagar: false, canAccessContasReceber: false,
      canAccessCobranca: false, canAccessFaturamento: false, canAccessLogistica: true,
      canAccessOperacao: true, canAccessMedicoes: false, canAccessManutencao: false,
      canAccessFrota: false, canAccessEstoque: false, canAccessComercial: false,
      canAccessRH: false, canAccessDP: false,
    },
    {
      nome: 'Manutenção/Frota',
      canAccessFinanceiro: false, canAccessContasPagar: false, canAccessContasReceber: false,
      canAccessCobranca: false, canAccessFaturamento: false, canAccessLogistica: false,
      canAccessOperacao: false, canAccessMedicoes: false, canAccessManutencao: true,
      canAccessFrota: true, canAccessEstoque: true, canAccessComercial: false,
      canAccessRH: false, canAccessDP: false,
    },
    {
      nome: 'Comercial',
      canAccessFinanceiro: false, canAccessContasPagar: false, canAccessContasReceber: false,
      canAccessCobranca: false, canAccessFaturamento: false, canAccessLogistica: false,
      canAccessOperacao: false, canAccessMedicoes: false, canAccessManutencao: false,
      canAccessFrota: false, canAccessEstoque: false, canAccessComercial: true,
      canAccessRH: false, canAccessDP: false,
    },
    {
      nome: 'Estoque',
      canAccessFinanceiro: false, canAccessContasPagar: false, canAccessContasReceber: false,
      canAccessCobranca: false, canAccessFaturamento: false, canAccessLogistica: false,
      canAccessOperacao: false, canAccessMedicoes: false, canAccessManutencao: false,
      canAccessFrota: false, canAccessEstoque: true, canAccessComercial: false,
      canAccessRH: false, canAccessDP: false,
    },
    {
      nome: 'Medições',
      canAccessFinanceiro: false, canAccessContasPagar: false, canAccessContasReceber: false,
      canAccessCobranca: false, canAccessFaturamento: true, canAccessLogistica: false,
      canAccessOperacao: false, canAccessMedicoes: true, canAccessManutencao: false,
      canAccessFrota: false, canAccessEstoque: false, canAccessComercial: false,
      canAccessRH: false, canAccessDP: false,
    },
    {
      nome: 'RH',
      canAccessFinanceiro: false, canAccessContasPagar: false, canAccessContasReceber: false,
      canAccessCobranca: false, canAccessFaturamento: false, canAccessLogistica: false,
      canAccessOperacao: false, canAccessMedicoes: false, canAccessManutencao: false,
      canAccessFrota: false, canAccessEstoque: false, canAccessComercial: false,
      canAccessRH: true, canAccessDP: false,
    },
    {
      nome: 'DP',
      canAccessFinanceiro: false, canAccessContasPagar: false, canAccessContasReceber: false,
      canAccessCobranca: false, canAccessFaturamento: false, canAccessLogistica: false,
      canAccessOperacao: false, canAccessMedicoes: false, canAccessManutencao: false,
      canAccessFrota: false, canAccessEstoque: false, canAccessComercial: false,
      canAccessRH: false, canAccessDP: true,
    },
  ];

  const catMap: Record<string, string> = {};

  for (const cat of categorias) {
    const existing = await prisma.categoriaEquipe.findFirst({ where: { nome: cat.nome } });
    if (existing) {
      await prisma.categoriaEquipe.update({ where: { id: existing.id }, data: cat });
      catMap[cat.nome] = existing.id;
      console.log(`  ✏️  Categoria "${cat.nome}" atualizada`);
    } else {
      const created = await prisma.categoriaEquipe.create({ data: cat });
      catMap[cat.nome] = created.id;
      console.log(`  ✅ Categoria "${cat.nome}" criada`);
    }
  }

  console.log('\n───────────────────────────────────────────────');

  // ═══════════════════════════════════════════════════════════
  // USUÁRIOS
  // ═══════════════════════════════════════════════════════════

  const defaultPassword = await bcrypt.hash('Nacional@2026', 10);

  const usuarios = [
    // MASTER
    { name: 'Bruno Bills',     email: 'bruno@nacionalhidro.com.br',    role: 'admin', departamento: 'Diretoria',   roleId: catMap['Master'] },
    { name: 'Fernanda Bills',  email: 'fernanda@nacionalhidro.com.br', role: 'admin', departamento: 'Diretoria',   roleId: catMap['Master'] },
    { name: 'Meire Bills',     email: 'meire@nacionalhidro.com.br',    role: 'admin', departamento: 'Diretoria',   roleId: catMap['Master'] },
    { name: 'Lucielle Magno',  email: 'lucielle@nacionalhidro.com.br', role: 'admin', departamento: 'Diretoria',   roleId: catMap['Master'] },

    // FINANCEIRO
    { name: 'Daiane Santana',  email: 'daiane@nacionalhidro.com.br',   role: 'user',  departamento: 'Financeiro',  roleId: catMap['Financeiro'] },

    // OPERAÇÕES / LOGÍSTICA
    { name: 'Tainara Santos',  email: 'tainara@nacionalhidro.com.br',  role: 'user',  departamento: 'Operações',   roleId: catMap['Operações'] },
    { name: 'Josiane Bills',   email: 'josiane@nacionalhidro.com.br',  role: 'user',  departamento: 'Operações',   roleId: catMap['Operações'] },

    // MANUTENÇÃO / FROTA
    { name: 'Renato',          email: 'renato@nacionalhidro.com.br',   role: 'user',  departamento: 'Manutenção',  roleId: catMap['Manutenção/Frota'] },
    { name: 'Vicente Junior',  email: 'vicente@nacionalhidro.com.br',  role: 'user',  departamento: 'Manutenção',  roleId: catMap['Manutenção/Frota'] },

    // COMERCIAL
    { name: 'Rafael',          email: 'rafael@nacionalhidro.com.br',   role: 'user',  departamento: 'Comercial',   roleId: catMap['Comercial'] },

    // MEDIÇÕES
    { name: 'Andreia Simiao',  email: 'andreia@nacionalhidro.com.br',  role: 'user',  departamento: 'Medições',    roleId: catMap['Medições'] },

    // RH
    { name: 'Luanna',          email: 'luanna@nacionalhidro.com.br',   role: 'user',  departamento: 'RH',          roleId: catMap['RH'] },

    // DP
    { name: 'Beatriz Cardozo', email: 'beatriz@nacionalhidro.com.br',  role: 'user',  departamento: 'DP',          roleId: catMap['DP'] },
  ];

  for (const user of usuarios) {
    const existing = await prisma.user.findFirst({ where: { email: user.email } });
    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { name: user.name, role: user.role, departamento: user.departamento, roleId: user.roleId, password: defaultPassword }
      });
      console.log(`  ✏️  Usuário "${user.name}" atualizado → ${user.departamento} (senha resetada)`);
    } else {
      await prisma.user.create({
        data: { ...user, password: defaultPassword }
      });
      console.log(`  ✅ Usuário "${user.name}" criado → ${user.departamento} (senha: Nacional@2026)`);
    }
  }

  console.log('\n═══════════════════════════════════════════════');
  console.log(`✅ ${categorias.length} categorias de permissão processadas`);
  console.log(`✅ ${usuarios.length} usuários processados`);
  console.log('🔑 Senha padrão para novos: Nacional@2026');
  console.log('═══════════════════════════════════════════════\n');
}

main()
  .catch(e => { console.error('❌ Erro no seed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
