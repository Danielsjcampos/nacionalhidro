
import os
import re

def replace_alerts(root_dir):
    for root, dirs, files in os.walk(root_dir):
        for file in files:
            if file.endswith(('.tsx', '.ts')):
                path = os.path.join(root, file)
                # Skip already handled file
                if 'Configuracoes.tsx' in path or 'ToastContext.tsx' in path: continue
                
                with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                
                if 'alert(' in content:
                    print(f"Processing {path}")
                    
                    # 1. Determine relative path to contexts/ToastContext
                    # root_dir is src/
                    rel_to_src = os.path.relpath(root, root_dir)
                    depth = 0 if rel_to_src == '.' else rel_to_src.count(os.sep) + 1
                    dots = '../' * depth if depth > 0 else './'
                    toast_import_path = f"{dots}contexts/ToastContext"
                    
                    # 2. Add import
                    import_line = f"import {{ useToast }} from '{toast_import_path}';"
                    if import_line not in content:
                        content = import_line + "\n" + content
                    
                    # 3. Add hook call
                    # Heuristic: find the first functional component definition
                    # look for "const ComponentName = () => {" or "export default function ComponentName() {"
                    comp_match = re.search(r'(const\s+\w+\s*=\s*(?:\([^)]*\)|)\s*=>\s*\{|function\s+\w+\s*\([^)]*\)\s*\{)', content)
                    if comp_match:
                        hook_call = "\n    const { showToast } = useToast();"
                        insert_pos = comp_match.end()
                        if "useToast();" not in content:
                             content = content[:insert_pos] + hook_call + content[insert_pos:]
                    
                    # 4. Replace alert( with showToast(
                    # We can try to be smart about success/error labels
                    content = content.replace("alert('", "showToast('")
                    content = content.replace('alert("', 'showToast("')
                    content = content.replace("alert(`", "showToast(`")
                    content = content.replace("alert(e.message)", "showToast(e.message, 'error')")
                    content = content.replace("alert(error", "showToast(error")
                    
                    # Simple regex for generic alert(
                    content = re.sub(r'alert\((.*?)\)', r'showToast(\1)', content)
                    
                    with open(path, 'w', encoding='utf-8') as f:
                        f.write(content)

if __name__ == "__main__":
    replace_alerts('/Users/viniciussaldanharosario/Downloads/nacionalhidro-main/frontend/src')
    print("Alerts replaced.")
