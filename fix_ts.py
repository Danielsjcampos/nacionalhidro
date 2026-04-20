import re
import os

hosp_file = 'backend/src/controllers/hospedagem.controller.ts'
with open(hosp_file, 'r') as f: content = f.read()
content = content.replace('await prisma.funcionario', 'await (prisma as any).funcionario')
content = content.replace('await prisma.oS', 'await (prisma as any).oS')
content = content.replace('await prisma.cliente', 'await (prisma as any).cliente')
with open(hosp_file, 'w') as f: f.write(content)

rh_file = 'backend/src/controllers/rh.controller.ts'
with open(rh_file, 'r') as f: content = f.read()
content = content.replace('await prisma.funcionario', 'await (prisma as any).funcionario')
content = content.replace('await prisma.oS', 'await (prisma as any).oS')
content = content.replace('await prisma.cliente', 'await (prisma as any).cliente')
content = content.replace('where: { id: funcionarioId }', 'where: { id: funcionarioId as string }')
with open(rh_file, 'w') as f: f.write(content)

ocor_file = 'backend/src/controllers/ocorrencia.controller.ts'
with open(ocor_file, 'r') as f: content = f.read()
content = re.sub(r'const \{ id \} = req\.params;', r'const id = req.params.id as string;', content)
with open(ocor_file, 'w') as f: f.write(content)

proc_file = 'backend/src/controllers/processo.controller.ts'
with open(proc_file, 'r') as f: content = f.read()
content = re.sub(r'const \{ id \} = req\.params;', r'const id = req.params.id as string;', content)
with open(proc_file, 'w') as f: f.write(content)

adm_service = 'backend/src/services/admissionDoc.service.ts'
with open(adm_service, 'r') as f: content = f.read()
if 'import * as fs' not in content:
    content = "import * as fs from 'fs';\nimport * as path from 'path';\n" + content
with open(adm_service, 'w') as f: f.write(content)

# Fix missing imports in medicao.routes.ts and rh.routes.ts
med_routes = 'backend/src/routes/medicao.routes.ts'
with open(med_routes, 'r') as f: content = f.read()
if 'listOSDisponiveis' not in content[:500]:
    content = content.replace('import { listMedicoes, getMedicao, updateItensMedicao } from \'../controllers/medicao.controller\';', 
                              'import { listMedicoes, getMedicao, updateItensMedicao, listOSDisponiveis, fecharPorRDO, updateMedicaoStatus, enviarAoCliente } from \'../controllers/medicao.controller\';')
with open(med_routes, 'w') as f: f.write(content)

rh_routes = 'backend/src/routes/rh.routes.ts'
with open(rh_routes, 'r') as f: content = f.read()
if 'checkCompliance' not in content[:500]:
    content = content.replace('import { listFuncionarios', 'import { listFuncionarios, checkCompliance')
with open(rh_routes, 'w') as f: f.write(content)

