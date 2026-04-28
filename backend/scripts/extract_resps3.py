import re
import json

sql_file = "/tmp/legacy_equip_resps.sql"
tables = {}

def parse_mysql_insert(sql_line):
    match = re.match(r"INSERT INTO `(.*?)` VALUES \((.*)\);$", sql_line.strip())
    if not match: return None, []
    
    table_name = match.group(1)
    values_str = match.group(2)
    rows, current_row, current_val = [], [], ""
    in_string, escape = False, False
    
    i = 0
    while i < len(values_str):
        c = values_str[i]
        if escape: current_val += c; escape = False
        elif c == '\\': escape = True
        elif c == "'": in_string = not in_string; current_val += c
        elif not in_string:
            if c == ',' and values_str[i-1] == ')' and values_str[i+1] == '(':
                rows.append(current_row); current_row = []; current_val = ""
            elif c == ',' and (i == 0 or values_str[i-1] != ')' or values_str[i+1] != '('):
                current_row.append(current_val); current_val = ""
            elif c == '(' and current_val.strip() == '': pass
            elif c == ')' and (i == len(values_str)-1 or values_str[i+1] == ','): current_row.append(current_val)
            else: current_val += c
        else: current_val += c
        i += 1
    if current_row: rows.append(current_row)
    return table_name, rows

with open(sql_file, "r") as f:
    for line in f:
        t, r = parse_mysql_insert(line)
        if t: tables[t] = r

def clean(val):
    val = val.strip()
    if val.startswith("'") and val.endswith("'"): val = val[1:-1]
    return val

equipamentos = {clean(row[0]): clean(row[1]) for row in tables.get('equipamentos', []) if len(row) > 1}

responsabilidades = {}
for row in tables.get('responsabilidades', []):
    if len(row) > 4:
        responsabilidades[clean(row[0])] = {
            'desc': clean(row[1]),
            'tipo': 'CONTRATANTE' if clean(row[3]) == '2' else 'CONTRATADA',
            'importante': clean(row[4]) == '1'
        }

er_to_r = {}
for row in tables.get('equipamento_responsabilidades_responsabilidade_links', []):
    if len(row) >= 3: er_to_r[clean(row[1])] = clean(row[2])

eq_to_er = {}
for row in tables.get('equipamentos_equipamento_responsabilidades_links', []):
    if len(row) >= 3:
        er_id = clean(row[1])
        eq_id = clean(row[2])
        if eq_id not in eq_to_er: eq_to_er[eq_id] = []
        eq_to_er[eq_id].append(er_id)

result = {}
for eq_id, eq_nome in equipamentos.items():
    resps = []
    for er_id in eq_to_er.get(eq_id, []):
        r_id = er_to_r.get(er_id)
        if r_id and r_id in responsabilidades:
            resps.append(responsabilidades[r_id])
    result[eq_nome] = resps

with open('/tmp/equip_resps_map.json', 'w') as f:
    json.dump(result, f, indent=2, ensure_ascii=False)
print("Done mapping.")
