const fs = require('fs');

let content = fs.readFileSync('frontend/src/components/ModalCadastroProposta.tsx', 'utf8');

// 1. Update the default warranty texts.
content = content.replace(
  /if \(horaItems\.length > 0\) text \+= '\\n' \+ \(cfg\('DescricaoGarantiaHora'\) \|\| ''\) \+ '\\n';/,
  `if (horaItems.length > 0) text += '\\n' + (cfg('DescricaoGarantiaHora') || 'Garantimos os equipamentos contra defeitos de fabricação e montagem. Em caso de quebra, será providenciado o reparo ou substituição do equipamento no menor prazo possível. Horas paradas por quebra de responsabilidade da Contratada não serão faturadas.') + '\\n';`
);

content = content.replace(
  /if \(diariaItems\.length > 0\) text \+= '\\n' \+ \(cfg\('DescricaoGarantiaDiaria'\) \|\| ''\) \+ '\\n';/,
  `if (diariaItems.length > 0) text += '\\n' + (cfg('DescricaoGarantiaDiaria') || 'Garantimos os equipamentos contra defeitos de fabricação e montagem. Em caso de quebra, será providenciado o reparo ou substituição no menor prazo possível.') + '\\n';`
);

// 2. Add state for isAddingCargo
content = content.replace(
  /const \[creatingContact, setCreatingContact\] = useState\(false\);/,
  `const [creatingContact, setCreatingContact] = useState(false);
  
  // Quick cargo state
  const [isAddingCargo, setIsAddingCargo] = useState(false);
  const [newCargoName, setNewCargoName] = useState('');
  const [creatingCargo, setCreatingCargo] = useState(false);
  const [internalCargos, setInternalCargos] = useState(options.cargos || []);
  
  useEffect(() => {
    setInternalCargos(options.cargos || []);
  }, [options.cargos]);
  `
);

// 3. Replace mapping over options.cargos to internalCargos in the select
content = content.replace(
  /\{options\.cargos\.map\(\(c: any\) => <option key=\{c\.id\}/g,
  `{internalCargos.map((c: any) => <option key={c.id}`
);
content = content.replace(
  /const c = options\.cargos\.find\(\(c: any\) => c\.id === ev\.target\.value\);/g,
  `const c = internalCargos.find((c: any) => c.id === ev.target.value);`
);

// 4. Update Modalidade text defaults
content = content.replace(
  /else \{\s*text \+= \`Garantia de faturamento de \$\{h\} horas diárias para \$\{eqText\}\.\\n\`;\s*\}/,
  `else {
        text += \`Garantia de faturamento mínimo de \${h} horas diárias para \${eqText}.\\n\`;
      }`
);

// 5. Add the "Novo Cargo..." option at the bottom of the select
content = content.replace(
  /\{options\.cargos\.map\(\(c: any\) => <option key=\{c\.id\} value=\{c\.id\}>\{c\.nome \|\| c\.descricao\}<\/option>\)\}/g,
  `{internalCargos.map((c: any) => <option key={c.id} value={c.id}>{c.nome || c.descricao}</option>)}
                              <option value="ADD_NEW">+ Cadastrar Novo Cargo...</option>`
);

content = content.replace(
  /<select value=\{e\.cargoId\} onChange=\{ev => \{ const c = options\.cargos\.find\(\(c: any\) => c\.id === ev\.target\.value\); setForm\(p => \(\{ \.\.\.p, equipes: p\.equipes\.map\(\(eq, j\) => j === i \? \{ \.\.\.eq, cargoId: ev\.target\.value, cargo: c \|\| null \} : eq\) \}\)\); \}\} className=\{cel\}>/g,
  `<select value={e.cargoId} onChange={ev => { 
                                if (ev.target.value === 'ADD_NEW') {
                                  setIsAddingCargo(true);
                                  return;
                                }
                                const c = internalCargos.find((c: any) => c.id === ev.target.value); 
                                setForm(p => ({ ...p, equipes: p.equipes.map((eq, j) => j === i ? { ...eq, cargoId: ev.target.value, cargo: c || null } : eq) })); 
                              }} className={cel}>`
);

// 6. Add the modal for Cargo right after the Quick Contact Modal
const quickContactModalMatch = `{isAddingContact && (`;
const cargoModalStr = `
        {/* Quick Cargo Modal */}
        {isAddingCargo && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
              <h3 className="text-lg font-black text-slate-800 uppercase mb-4 border-b pb-2">Novo Cargo Rápido</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase mb-1 block">Nome do Cargo <span className="text-red-500">*</span></label>
                  <input 
                    value={newCargoName}
                    onChange={e => setNewCargoName(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-sm focus:border-blue-500 outline-none"
                    placeholder="Ex: Líder de Equipe"
                    autoFocus
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => { setIsAddingCargo(false); setNewCargoName(''); }}
                    className="flex-1 py-2 text-xs font-black uppercase text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    disabled={creatingCargo || !newCargoName.trim()}
                    onClick={async () => {
                      setCreatingCargo(true);
                      try {
                        const res = await api.post(\`/cargos\`, { nome: newCargoName, descricao: newCargoName });
                        const savedCargo = res.data;
                        setInternalCargos(prev => [...prev, savedCargo]);
                        // Atribuir o cargo à equipe (o ideal seria achar qual index chamou, mas aqui podemos deixar o usuário selecionar novamente)
                        setIsAddingCargo(false);
                        setNewCargoName('');
                      } catch (err) {
                        alert('Erro ao salvar cargo');
                      } finally {
                        setCreatingCargo(false);
                      }
                    }}
                    className="flex-1 py-2 text-xs font-black uppercase bg-blue-600 text-white hover:bg-blue-700 rounded-lg shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2"
                  >
                    {creatingCargo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Salvar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
`;

content = content.replace('{/* Quick Contact Modal */}', cargoModalStr + '\n        {/* Quick Contact Modal */}');

// Write back
fs.writeFileSync('frontend/src/components/ModalCadastroProposta.tsx', content);

