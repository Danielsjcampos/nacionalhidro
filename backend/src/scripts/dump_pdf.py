import pdfplumber

def dump_first_page():
    with pdfplumber.open("/Users/viniciussaldanharosario/Downloads/nacionalhidro-main/PLANO CONTAS NACIONAL HIDROSANEAMENTO pdf.pdf") as pdf:
        page = pdf.pages[0]
        text = page.extract_text()
        print("--- PAGE 1 ---")
        print(text[:1000])

dump_first_page()
