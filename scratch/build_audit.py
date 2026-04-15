
import os

def scan_frontend(root_dir):
    issues = []
    for root, dirs, files in os.walk(root_dir):
        for file in files:
            if file.endswith(('.tsx', '.ts')):
                path = os.path.join(root, file)
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        lines = f.readlines()
                        content = "".join(lines)
                except UnicodeDecodeError:
                    issues.append(f"UNDECODABLE: {path}")
                    continue

                # Check for alert
                if 'alert(' in content:
                    issues.append(f"ALERT FOUND: {path}")

                # Check for duplicate tags at end
                if content.strip().endswith('</div>\n    );\n}\n</div>\n    );\n}'):
                    issues.append(f"DUPLICATE TAGS: {path}")
                
                # Check for corrupted special chars (ç, ã, etc)
                # If we see things like \xc3\xa7 it might be fine, but let's check for weird patterns
                # This is hard to automate perfectly, but we can look for specific mangled strings
                mangled = ["M-CM-", "NM-CM-#o", "Sincronizaçãó"] # etc
                for m in mangled:
                    if m in content:
                         issues.append(f"CORRUPTED TEXT ({m}): {path}")

    return issues

if __name__ == "__main__":
    report = scan_frontend('/Users/viniciussaldanharosario/Downloads/nacionalhidro-main/frontend/src')
    for issue in report:
        print(issue)
