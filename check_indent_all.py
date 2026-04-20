import sys
import re
def check(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            lines = f.readlines()
    except Exception as e: return
    blocks = []
    for i, line in enumerate(lines):
        cleaned = re.sub(r'//.*', '', line)
        cleaned = re.sub(r'`[^`]*`', '""', cleaned)
        cleaned = re.sub(r"'[^']*'", '""', cleaned)
        cleaned = re.sub(r'"[^"]*"', '""', cleaned)
        for c in cleaned:
            if c == '{': blocks.append(i+1)
            elif c == '}':
                if blocks: blocks.pop()
                else: 
                    print(f"{filepath}: Extra }} at line {i+1}")
    if blocks:
        print(f"{filepath}: Unclosed blocks opened at lines: {blocks}")

import os
for root, _, files in os.walk('backend'):
    for file in files:
        if file.endswith('.ts'):
            check(os.path.join(root, file))
