with open('backend/src/controllers/faturamento.controller.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

blocks = []
for i, line in enumerate(lines):
    # Strip string literals purely for checking brackets roughly
    import re
    cleaned = re.sub(r'//.*', '', line)
    cleaned = re.sub(r'`[^`]*`', '""', cleaned)
    cleaned = re.sub(r"'[^']*'", '""', cleaned)
    cleaned = re.sub(r'"[^"]*"', '""', cleaned)
    
    for c in cleaned:
        if c == '{': blocks.append(i+1)
        elif c == '}':
            if blocks: blocks.pop()
if blocks:
    print("Unclosed blocks opened at lines:", blocks)
