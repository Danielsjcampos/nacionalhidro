
import os

def fix_imprimir_os():
    path = '/Users/viniciussaldanharosario/Downloads/nacionalhidro-main/frontend/src/components/ImprimirOS.tsx'
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    # Fix the corrupted line
    import re
    p = r'<p className="text-\[9px\] font-black mt-2 text-center uppercase tracking-tight">.*?</p>'
    replacement = '<p className="text-[9px] font-black mt-2 text-center uppercase tracking-tight">Não aceitamos reclamações após a assinatura do relatório de serviço.</p>'
    content = re.sub(p, replacement, content)
    
    # Fix ending
    content = content.strip()
    # If it ends with extra tags, clean it
    if content.endswith('); };'):
        content = content[:-5] + ');\n};'
    
    # Actually, let's just ensure the final structure
    if '</div>\n    );\n};' not in content:
         # Remove any duplicate ending
         content = content.split('</div>\n    );\n};')[0] + '</div>\n    );\n};'
         
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

def fix_migracao_page():
    path = '/Users/viniciussaldanharosario/Downloads/nacionalhidro-main/frontend/src/pages/MigracaoPage.tsx'
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    # Fix the corrupted Sincronização
    content = content.replace("Iniciar Sincroniza\xc3\xa7\xc3\xa3o", "Iniciar Sincronização")
    # Fix any other mangled version
    import re
    content = re.sub(r"Sincroniza.*? Total", "Sincronização Total", content)
    
    # Restore Loader2 if missing
    if '<button' in content and '<Loader2' not in content:
        content = content.replace('Iniciar Sincronização Total\'}', "Iniciar Sincronização Total'}\n            </button>")
        # Wait, I need to restore the actual logic
        loader_line = "{loading ? <Loader2 className=\"w-4 h-4 animate-spin\" /> : <Upload className=\"w-4 h-4\" />}"
        if loader_line not in content:
            content = content.replace('            >', '            >\n                ' + loader_line)

    # Fix ending (remove dupe)
    if content.count('</div>\n    );\n}') > 1:
        parts = content.split('</div>\n    );\n}')
        content = parts[0] + '</div>\n    );\n}' + parts[1] # Keep the component and the start of next one
        # This is complex because there are 2 components.
        
    # Let's just fix the very end of the file
    if content.endswith('</div>\n    );\n}\n</div>\n    );\n}\n'):
         content = content.replace('</div>\n    );\n}\n</div>\n    );\n}\n', '</div>\n    );\n}\n')

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

def fix_configuracoes():
    path = '/Users/viniciussaldanharosario/Downloads/nacionalhidro-main/frontend/src/pages/Configuracoes.tsx'
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    content = content.replace('Organização** > **Service', 'Organização** &gt; **Service')
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == "__main__":
    fix_imprimir_os()
    fix_migracao_page()
    fix_configuracoes()
    print("Fixes applied.")
