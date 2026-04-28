import re
import json

sql_file = "/tmp/legacy_equip_resps.sql"

tables = {}

with open(sql_file, "r") as f:
    lines = f.readlines()

for line in lines:
    match = re.match(r"INSERT INTO `(.*?)` VALUES \((.*)\);", line)
    if not match:
        continue
    table_name = match.group(1)
    values_str = match.group(2)
    
    # Simple regex to split by ),( but keeping strings intact is hard with regex alone
    # We will use a basic state machine
    
    in_string = False
    escape_next = False
    current_val = ""
    rows = []
    current_row = []
    
    for char in values_str:
        if escape_next:
            current_val += char
            escape_next = False
            continue
        if char == '\\':
            escape_next = True
            continue
        if char == "'":
            in_string = not in_string
            continue
        
        if not in_string:
            if char == '(' and current_val.strip() == '':
                continue
            if char == ',':
                current_row.append(current_val)
                current_val = ""
                continue
            if char == ')':
                current_row.append(current_val)
                rows.append(current_row)
                current_row = []
                current_val = ""
                continue
        current_val += char
    
    if table_name not in tables:
        tables[table_name] = []
    tables[table_name].extend(rows)

print("Parsed tables:", tables.keys())

equipamentos = {row[0]: row[1].strip() for row in tables.get('equipamentos', []) if len(row) > 1}
responsabilidades = {row[0]: {'desc': row[1].strip(), 'tipo': 'CONTRATANTE' if row[3].strip() == '2' else 'CONTRATADA', 'importante': row[4].strip() == '1'} for row in tables.get('responsabilidades', []) if len(row) > 4}

equipamento_resps = {}
# id -> responsabilidade_id
# table: equipamento_responsabilidades_responsabilidade_links (equipamento_responsabilidade_id, responsabilidade_id)
# BUT wait! Legacy Strapi tables structure:
# `equipamentos_equipamento_responsabilidades_links` has: id, equipamento_id, equipamento_responsabilidade_id
# `equipamento_responsabilidades_responsabilidade_links` has: id, equipamento_responsabilidade_id, responsabilidade_id

er_to_r = {}
for row in tables.get('equipamento_responsabilidades_responsabilidade_links', []):
    if len(row) >= 3:
        er_id = row[1]
        r_id = row[2]
        er_to_r[er_id] = r_id

eq_to_er = {}
for row in tables.get('equipamentos_equipamento_responsabilidades_links', []):
    if len(row) >= 3:
        eq_id = row[1]
        er_id = row[2]
        if eq_id not in eq_to_er:
            eq_to_er[eq_id] = []
        eq_to_er[eq_id].append(er_id)

result = {}
for eq_id, eq_nome in equipamentos.items():
    if eq_nome.startswith("'"): eq_nome = eq_nome[1:]
    if eq_nome.endswith("'"): eq_nome = eq_nome[:-1]
    
    resps = []
    for er_id in eq_to_er.get(eq_id, []):
        r_id = er_to_r.get(er_id)
        if r_id and r_id in responsabilidades:
            r = responsabilidades[r_id]
            desc = r['desc']
            if desc.startswith("'"): desc = desc[1:]
            if desc.endswith("'"): desc = desc[:-1]
            resps.append({
                'descricao': desc,
                'tipo': r['tipo'],
                'importante': r['importante']
            })
    result[eq_nome] = resps

with open('/tmp/equip_resps_map.json', 'w') as f:
    json.dump(result, f, indent=2, ensure_ascii=False)
    
print("Successfully generated mapping at /tmp/equip_resps_map.json")
