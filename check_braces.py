import re

def check(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            lines = f.readlines()
    except Exception as e: return
    blocks = []
    for i, line in enumerate(lines):
        for j, c in enumerate(line):
            if c == '{': blocks.append(('{', i+1))
            elif c == '}':
                if blocks and blocks[-1][0] == '{': blocks.pop()
                else: print(f"{filepath}: Extra }} at line {i+1}")
            elif c == '(': blocks.append(('(', i+1))
            elif c == ')':
                if blocks and blocks[-1][0] == '(': blocks.pop()
                else: print(f"{filepath}: Extra ) at line {i+1}")
            elif c == '[': blocks.append(('[', i+1))
            elif c == ']':
                if blocks and blocks[-1][0] == '[': blocks.pop()
                else: print(f"{filepath}: Extra ] at line {i+1}")
    if blocks:
        print(f"{filepath}: Unclosed blocks: {blocks}")

import os
for root, _, files in os.walk('frontend/src'):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            check(os.path.join(root, file))
