# System Architectural & Security Map

## 🛡️ Security Implementation Matrix

- Helmet.js security headers implemented.
- CORS middleware implemented.
- Payload size limits configured.
- Password hashing (bcrypt) found in auth.controller.ts.

## 🚀 Backend API Inventory

| Module | Method | Path | Protected | Source File |
| --- | --- | --- | --- | --- |
| auth.routes.ts | POST | /login | ❌ | `backend\src\routes\auth.routes.ts` |
| auth.routes.ts | POST | /register | ❌ | `backend\src\routes\auth.routes.ts` |
| categoria.routes.ts | GET | / | ✅ | `backend\src\routes\categoria.routes.ts` |
| categoria.routes.ts | POST | / | ✅ | `backend\src\routes\categoria.routes.ts` |
| categoria.routes.ts | PATCH | /:id | ✅ | `backend\src\routes\categoria.routes.ts` |
| categoria.routes.ts | DELETE | /:id | ✅ | `backend\src\routes\categoria.routes.ts` |
| cliente.routes.ts | GET | / | ✅ | `backend\src\routes\cliente.routes.ts` |
| cliente.routes.ts | POST | / | ✅ | `backend\src\routes\cliente.routes.ts` |
| cliente.routes.ts | GET | /:id | ✅ | `backend\src\routes\cliente.routes.ts` |
| configuracao.routes.ts | GET | / | ❌ | `backend\src\routes\configuracao.routes.ts` |
| configuracao.routes.ts | POST | / | ❌ | `backend\src\routes\configuracao.routes.ts` |
| configuracao.routes.ts | PUT | / | ❌ | `backend\src\routes\configuracao.routes.ts` |
| dashboard.routes.ts | GET | /stats | ✅ | `backend\src\routes\dashboard.routes.ts` |
| equipamento.routes.ts | GET | / | ✅ | `backend\src\routes\equipamento.routes.ts` |
| equipamento.routes.ts | POST | / | ✅ | `backend\src\routes\equipamento.routes.ts` |
| equipamento.routes.ts | PUT | /:id | ✅ | `backend\src\routes\equipamento.routes.ts` |
| equipamento.routes.ts | DELETE | /:id | ✅ | `backend\src\routes\equipamento.routes.ts` |
| equipe.routes.ts | GET | /categories | ✅ | `backend\src\routes\equipe.routes.ts` |
| equipe.routes.ts | GET | /members | ✅ | `backend\src\routes\equipe.routes.ts` |
| equipe.routes.ts | POST | /members | ✅ | `backend\src\routes\equipe.routes.ts` |
| equipe.routes.ts | PATCH | /members/:id | ✅ | `backend\src\routes\equipe.routes.ts` |
| estoque.routes.ts | GET | / | ✅ | `backend\src\routes\estoque.routes.ts` |
| estoque.routes.ts | POST | /:id/movimentacao | ✅ | `backend\src\routes\estoque.routes.ts` |
| financeiro.routes.ts | GET | / | ✅ | `backend\src\routes\financeiro.routes.ts` |
| financeiro.routes.ts | POST | / | ✅ | `backend\src\routes\financeiro.routes.ts` |
| logistica.routes.ts | GET | /escalas | ✅ | `backend\src\routes\logistica.routes.ts` |
| logistica.routes.ts | POST | /escalas | ✅ | `backend\src\routes\logistica.routes.ts` |
| logistica.routes.ts | PATCH | /escalas/:id | ✅ | `backend\src\routes\logistica.routes.ts` |
| logistica.routes.ts | DELETE | /escalas/:id | ✅ | `backend\src\routes\logistica.routes.ts` |
| logistica.routes.ts | GET | /veiculos | ✅ | `backend\src\routes\logistica.routes.ts` |
| logistica.routes.ts | POST | /veiculos | ✅ | `backend\src\routes\logistica.routes.ts` |
| logistica.routes.ts | PATCH | /veiculos/:id | ✅ | `backend\src\routes\logistica.routes.ts` |
| logistica.routes.ts | DELETE | /veiculos/:id | ✅ | `backend\src\routes\logistica.routes.ts` |
| logistica.routes.ts | PATCH | /veiculos/:id/manutencao | ✅ | `backend\src\routes\logistica.routes.ts` |
| manutencao.routes.ts | GET | / | ✅ | `backend\src\routes\manutencao.routes.ts` |
| manutencao.routes.ts | POST | / | ✅ | `backend\src\routes\manutencao.routes.ts` |
| manutencao.routes.ts | PATCH | /:id | ✅ | `backend\src\routes\manutencao.routes.ts` |
| manutencao.routes.ts | DELETE | /:id | ✅ | `backend\src\routes\manutencao.routes.ts` |
| manutencao.routes.ts | PATCH | /:id/liberar | ✅ | `backend\src\routes\manutencao.routes.ts` |
| os.routes.ts | GET | / | ✅ | `backend\src\routes\os.routes.ts` |
| os.routes.ts | POST | / | ✅ | `backend\src\routes\os.routes.ts` |
| os.routes.ts | GET | /:id | ✅ | `backend\src\routes\os.routes.ts` |
| os.routes.ts | PATCH | /:id | ✅ | `backend\src\routes\os.routes.ts` |
| os.routes.ts | DELETE | /:id | ✅ | `backend\src\routes\os.routes.ts` |
| proposta.routes.ts | GET | / | ✅ | `backend\src\routes\proposta.routes.ts` |
| proposta.routes.ts | POST | / | ✅ | `backend\src\routes\proposta.routes.ts` |
| proposta.routes.ts | GET | /:id | ✅ | `backend\src\routes\proposta.routes.ts` |
| proposta.routes.ts | PATCH | /:id | ✅ | `backend\src\routes\proposta.routes.ts` |
| proposta.routes.ts | DELETE | /:id | ✅ | `backend\src\routes\proposta.routes.ts` |
| proposta.routes.ts | PATCH | /:id/status | ✅ | `backend\src\routes\proposta.routes.ts` |
| rental.routes.ts | GET | /contracts | ✅ | `backend\src\routes\rental.routes.ts` |
| rental.routes.ts | POST | /contracts | ✅ | `backend\src\routes\rental.routes.ts` |
| rental.routes.ts | GET | /properties | ✅ | `backend\src\routes\rental.routes.ts` |
| rental.routes.ts | POST | /properties | ✅ | `backend\src\routes\rental.routes.ts` |
| rh.routes.ts | GET | / | ✅ | `backend\src\routes\rh.routes.ts` |
| rh.routes.ts | POST | / | ✅ | `backend\src\routes\rh.routes.ts` |
| rh.routes.ts | GET | /:id | ✅ | `backend\src\routes\rh.routes.ts` |
| rh.routes.ts | PUT | /:id | ✅ | `backend\src\routes\rh.routes.ts` |

## 🌐 Frontend API Dependencies

| Page/Component | Client | Method | Endpoint |
| --- | --- | --- | --- |
| `frontend\src\pages\Clientes.tsx` | axios | POST | http://localhost:3000/clientes |
| `frontend\src\pages\Clientes.tsx` | axios | GET | http://localhost:3000/clientes/${cliente.id} |
| `frontend\src\pages\Clientes.tsx` | axios | DELETE | http://localhost:3000/clientes/${id} |
| `frontend\src\pages\Clientes.tsx` | axios | PATCH | http://localhost:3000/clientes/${selectedCliente.id} |
| `frontend\src\pages\Clientes.tsx` | axios | GET | http://localhost:3000/clientes?search=${searchTerm} |
| `frontend\src\pages\Configuracoes.tsx` | axios | GET | http://localhost:3000/configuracoes |
| `frontend\src\pages\Configuracoes.tsx` | axios | POST | http://localhost:3000/configuracoes |
| `frontend\src\pages\Dashboard.tsx` | axios | GET | http://localhost:3000/dashboard/stats |
| `frontend\src\pages\Estoque.tsx` | axios | GET | http://localhost:3000/estoque |
| `frontend\src\pages\EstoqueEquipamentos.tsx` | axios | GET | http://localhost:3000/equipamentos |
| `frontend\src\pages\EstoqueEquipamentos.tsx` | axios | POST | http://localhost:3000/equipamentos |
| `frontend\src\pages\EstoqueEquipamentos.tsx` | axios | PUT | http://localhost:3000/equipamentos/${editingItem.id} |
| `frontend\src\pages\EstoqueEquipamentos.tsx` | axios | DELETE | http://localhost:3000/equipamentos/${id} |
| `frontend\src\pages\EstoqueEquipamentos.tsx` | axios | GET | http://localhost:3000/estoque |
| `frontend\src\pages\Financeiro.tsx` | axios | GET | http://localhost:3000/financeiro |
| `frontend\src\pages\Logistica.tsx` | axios | GET | http://localhost:3000/clientes |
| `frontend\src\pages\Logistica.tsx` | axios | POST | http://localhost:3000/logistica/${endpoint} |
| `frontend\src\pages\Logistica.tsx` | axios | PATCH | http://localhost:3000/logistica/${endpoint}/${selectedItem.id} |
| `frontend\src\pages\Logistica.tsx` | axios | GET | http://localhost:3000/logistica/escalas |
| `frontend\src\pages\Logistica.tsx` | axios | GET | http://localhost:3000/logistica/veiculos |
| `frontend\src\pages\Logistica.tsx` | axios | PATCH | http://localhost:3000/logistica/veiculos/${maintModal.veiculo.id}/manutencao |
| `frontend\src\pages\Manutencao.tsx` | axios | GET | http://localhost:3000/logistica/veiculos |
| `frontend\src\pages\Manutencao.tsx` | axios | GET | http://localhost:3000/manutencao |
| `frontend\src\pages\Manutencao.tsx` | axios | POST | http://localhost:3000/manutencao |
| `frontend\src\pages\Manutencao.tsx` | axios | PATCH | http://localhost:3000/manutencao/${id}/liberar |
| `frontend\src\pages\Manutencao.tsx` | axios | PATCH | http://localhost:3000/manutencao/${selectedMaint.id} |
| `frontend\src\pages\OS.tsx` | axios | GET | http://localhost:3000/os |
| `frontend\src\pages\OS.tsx` | axios | POST | http://localhost:3000/os |
| `frontend\src\pages\OS.tsx` | axios | GET | http://localhost:3000/os/${os.id} |
| `frontend\src\pages\OS.tsx` | axios | PATCH | http://localhost:3000/os/${selectedOS.id} |
| `frontend\src\pages\OS.tsx` | axios | GET | http://localhost:3000/propostas |
| `frontend\src\pages\Propostas.tsx` | axios | GET | http://localhost:3000/clientes |
| `frontend\src\pages\Propostas.tsx` | axios | POST | http://localhost:3000/propostas |
| `frontend\src\pages\Propostas.tsx` | axios | GET | http://localhost:3000/propostas/${prop.id} |
| `frontend\src\pages\Propostas.tsx` | axios | PATCH | http://localhost:3000/propostas/${selectedProposta.id} |
| `frontend\src\pages\Propostas.tsx` | axios | GET | http://localhost:3000/propostas?search=${searchTerm} |
| `frontend\src\pages\RH.tsx` | axios | GET | http://localhost:3000/rh |
| `frontend\src\pages\RH.tsx` | axios | POST | http://localhost:3000/rh |
| `frontend\src\pages\RH.tsx` | axios | PUT | http://localhost:3000/rh/${selectedFunc.id} |
| `frontend\src\pages\Usuarios.tsx` | axios | POST | http://localhost:3000/categorias |
| `frontend\src\pages\Usuarios.tsx` | axios | PATCH | http://localhost:3000/categorias/${editingCat.id} |
| `frontend\src\pages\Usuarios.tsx` | axios | GET | http://localhost:3000/equipe/categories |
| `frontend\src\pages\Usuarios.tsx` | axios | GET | http://localhost:3000/equipe/members |
| `frontend\src\pages\Usuarios.tsx` | axios | POST | http://localhost:3000/equipe/members |
| `frontend\src\pages\Usuarios.tsx` | axios | PATCH | http://localhost:3000/equipe/members/${editingUser.id} |
