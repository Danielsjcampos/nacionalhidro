import pdfplumber
import re
import json

def parse_plano_contas_pdf(pdf_path, output_json, empresa_type):
    records = []
    
    # We want to find: CODE (like 1, 1.1, 1.1.01) + SPACE + DESCRIPTION + SPACE + LEVEL (1 digit)
    # The line might have garbage at the start like "1 5 S " or "6 "
    
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if not text: continue
            for line in text.split('\n'):
                line = line.strip()
                # Remove lone "1 " at the start
                if line.startswith("1 ") and len(line) > 2:
                    line = line[2:].strip()
                
                # Try to extract ending digit (nivel)
                match = re.search(r'\s+(\d)$', line)
                if not match:
                    continue
                nivel = int(match.group(1))
                
                # Remove the trailing level
                line_without_nivel = line[:match.start()]
                
                # Now looking for the Account Code which is the last sequence of numbers/dots before text
                # It can be '1', '1.1', '1.1.1.01.000001'
                
                # Let's find all chunks that look like a code
                tokens = line_without_nivel.split(' ')
                # The description will be from the first token that has alphabetic characters to the end.
                # The code will be the token right before it!
                
                desc_start_idx = -1
                for i, token in enumerate(tokens):
                    if re.search(r'[A-Za-zÀ-Ú]', token):
                        desc_start_idx = i
                        break
                
                if desc_start_idx == -1:
                   continue
                   
                codigo = tokens[desc_start_idx - 1].strip()
                # validate if codigo is indeed formatting like \d+(\.\d+)*
                if not re.match(r'^\d+(?:\.\d+)*$', codigo):
                    continue
                
                descricao = ' '.join(tokens[desc_start_idx:])
                tipo = "SINTETICA" if "S " in line_without_nivel[:line_without_nivel.find(codigo)] or line_without_nivel.startswith("S ") else "ANALITICA"
                natureza = "RECEITA" if codigo.startswith("3") or codigo.startswith("4") else "DESPESA"
                
                records.append({
                    "codigo": codigo,
                    "descricao": descricao,
                    "nivel": nivel,
                    "tipo": tipo,
                    "natureza": natureza,
                    "empresa": empresa_type
                })
                
    # Fill parentIds
    for i, a in enumerate(records):
        codigo = a["codigo"]
        if "." in codigo:
            # The parent code could be literally the prefix (e.g. 1.1.1.01 parent is 1.1.1)
            # Find the best match
            parts = codigo.split('.')
            parent_code_candidates = ['.'.join(parts[:k]) for k in range(1, len(parts))]
            parent_code_candidates.reverse()
            
            parent_found = None
            for cand in parent_code_candidates:
                parent = next((p for p in records if p["codigo"] == cand), None)
                if parent:
                    parent_found = parent["codigo"]
                    break
            a["parentCodigo"] = parent_found
        else:
            a["parentCodigo"] = None

    with open(output_json, 'w', encoding='utf-8') as f:
        json.dump(records, f, ensure_ascii=False, indent=2)
    
    print(f"Extracted {len(records)} accounts from {pdf_path} into {output_json}")

parse_plano_contas_pdf(
    "/Users/viniciussaldanharosario/Downloads/nacionalhidro-main/PLANO CONTAS NACIONAL HIDROSANEAMENTO pdf.pdf",
    "/Users/viniciussaldanharosario/Downloads/nacionalhidro-main/backend/src/scripts/hidrosaneamento.json",
    "HIDRO"
)

parse_plano_contas_pdf(
    "/Users/viniciussaldanharosario/Downloads/nacionalhidro-main/PLANO DE CONTAS NACIONAL LOCAÇÃO PDF.pdf",
    "/Users/viniciussaldanharosario/Downloads/nacionalhidro-main/backend/src/scripts/locacao.json",
    "LOCACAO"
)
