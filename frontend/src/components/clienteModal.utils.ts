// ── Constantes compartilhadas do ModalCliente ──────────────────────────────
export const SEGMENTOS = [
  'Saneamento','Petroquímica','Construção Civil','Indústria Alimentícia',
  'Papel e Celulose','Mineração','Energia','Logística','Portuário',
  'Metalurgia','Têxtil','Farmacêutico','Agronegócio','Serviços','Outros',
];

export const TIPOS_FATURAMENTO = [
  { value: 1, label: 'Mensal' },
  { value: 2, label: 'Quinzenal' },
  { value: 3, label: 'Semanal' },
  { value: 4, label: 'Por OS' },
];

export const DIAS_SEMANA = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terça' },
  { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },
  { value: 5, label: 'Sexta' },
  { value: 6, label: 'Sábado' },
];

export const TIPOS_CONTATO = ['Comercial','Técnico','Comprador','Financeiro','Operacional'];
export const STATUS_HISTORICO = ['NOVO','RETORNAR LIGAÇÃO','FINALIZADO'];

// ── Masks ──────────────────────────────────────────────────────────────────
export const maskCNPJ = (v: string) =>
  v.replace(/\D/g,'')
   .replace(/(\d{2})(\d)/,'$1.$2')
   .replace(/(\d{3})(\d)/,'$1.$2')
   .replace(/(\d{3})(\d)/,'$1/$2')
   .replace(/(\d{4})(\d)/,'$1-$2')
   .slice(0,18);

export const maskCPF = (v: string) =>
  v.replace(/\D/g,'')
   .replace(/(\d{3})(\d)/,'$1.$2')
   .replace(/(\d{3})(\d)/,'$1.$2')
   .replace(/(\d{3})(\d)/,'$1-$2')
   .slice(0,14);

export const maskPhone = (v: string) =>
  v.replace(/\D/g,'')
   .replace(/(\d{2})(\d)/,'($1) $2')
   .replace(/(\d{5})(\d)/,'$1-$2')
   .slice(0,15);

export const maskCEP = (v: string) =>
  v.replace(/\D/g,'').replace(/(\d{5})(\d)/,'$1-$2').slice(0,9);

// ── Validators ─────────────────────────────────────────────────────────────
export const isValidCNPJ = (cnpj: string): boolean => {
  const n = cnpj.replace(/\D/g,'');
  if (n.length !== 14) return false;
  if (/^(\d)\1+$/.test(n)) return false;
  const calc = (len: number) => {
    let s = 0, p = len - 7;
    for (let i = 0; i < len; i++) { s += parseInt(n[i]) * p--; if (p < 2) p = 9; }
    const r = s % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === parseInt(n[12]) && calc(13) === parseInt(n[13]);
};

export const isValidCPF = (cpf: string): boolean => {
  const n = cpf.replace(/\D/g,'');
  if (n.length !== 11) return false;
  if (/^(\d)\1+$/.test(n)) return false;
  const calc = (len: number) => {
    let s = 0;
    for (let i = 0; i < len; i++) s += parseInt(n[i]) * (len + 1 - i);
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === parseInt(n[9]) && calc(10) === parseInt(n[10]);
};

// ── Contato vazio ───────────────────────────────────────────────────────────
export const emptyContato = () => ({
  _id: Math.random().toString(36).slice(2),
  nome: '', setor: '', email: '', telefone: '', celular: '', ramal: '',
  tipo: '', emailMedicao: false, emailProposta: false,
});

// ── Input class helper ──────────────────────────────────────────────────────
export const ic = (valid = true, extra = '') =>
  `w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition bg-white ${valid ? 'border-slate-200' : 'border-red-400'} ${extra}`;
