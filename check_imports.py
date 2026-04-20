import os
import re

files_to_check = [
    'frontend/src/pages/VagaSolicitacao.tsx',
    'frontend/src/pages/OcorrenciasPage.tsx',
    'frontend/src/pages/ProcessosTrabalhistasPage.tsx',
    'frontend/src/pages/RelatoriosCentralPage.tsx'
]

for file in files_to_check:
    if not os.path.exists(file):
        continue
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find words like useState, useEffect, User, ShieldAlert, etc.
    # Check if they exist in an import statement
    words = re.findall(r'\b([A-Z][a-z0-9A-Z]+|useState|useEffect|useRouter|useParams|useLocation|useNavigate|toast)\b', content)
    unique_words = set(words)
    
    # Ignore some reserved words and language keywords
    ignore = {'React', 'String', 'Number', 'Boolean', 'Array', 'Date', 'Promise', 'Error', 'Console', 'Math', 'JSON', 'Object'}
    
    imports_block = re.findall(r'import\s+.*?;', content, re.DOTALL)
    imported_words = set()
    for block in imports_block:
        words_in_import = re.findall(r'\b[A-Za-z0-9_]+\b', block)
        imported_words.update(words_in_import)
        
    for w in unique_words:
        if w not in imported_words and w not in ignore: # naive check
            # Not imported! But maybe it's declared locally?
            if not re.search(r'(const|let|var|function|type|interface|class|enum)\s+' + w + r'\b', content):
                # Also check component uses: <Test
                # Just print to review manually
                pass

    # A better check: verify JSX closing tags
    # <Tag ...> ... </Tag>
    tags = re.findall(r'<([A-Za-z0-9_]+)[^>]*>', content)
    close_tags = re.findall(r'</([A-Za-z0-9_]+)>', content)
    # It takes too long to do a full generic XML parser in python, let's just use `grep` manually below.
