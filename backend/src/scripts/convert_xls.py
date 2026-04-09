import pandas as pd
import json
import sys

def parse_xls_to_json(file_path, output_path):
    try:
        df = pd.read_excel(file_path, engine='xlrd')
        # Fill NaN with empty strings
        df = df.fillna("")
        records = df.to_dict(orient="records")
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(records, f, ensure_ascii=False, indent=2)
        print(f"Successfully converted {file_path} to {output_path}")
    except Exception as e:
        print(f"Failed to convert {file_path}: {e}")

parse_xls_to_json(
    "/Users/viniciussaldanharosario/Downloads/nacionalhidro-main/PLANO CONTAS NACIONAL HIDROSANEAMENTO EXCEL.xls",
    "/Users/viniciussaldanharosario/Downloads/nacionalhidro-main/backend/src/scripts/hidrosaneamento.json"
)

parse_xls_to_json(
    "/Users/viniciussaldanharosario/Downloads/nacionalhidro-main/PLANO DE CONTAS NACIONAL LOCAÇÃO.excel.xls",
    "/Users/viniciussaldanharosario/Downloads/nacionalhidro-main/backend/src/scripts/locacao.json"
)
