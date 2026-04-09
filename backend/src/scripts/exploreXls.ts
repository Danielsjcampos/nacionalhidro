import * as xlsx from 'xlsx';
import * as fs from 'fs';

const loadFile = (filePath: string) => {
    console.log(`\n--- Reading ${filePath} ---`);
    try {
        const buffer = fs.readFileSync(filePath);
        const head = buffer.subarray(0, 100).toString('utf-8');
        console.log("HEAD AS UTF8:", head);
        
        const workbook = xlsx.read(buffer, { type: 'buffer' });
        console.log("SHEET NAMES:", workbook.SheetNames);
        for (const sheetName of workbook.SheetNames) {
            console.log(`SHEET [${sheetName}] ROWS:`);
            const json = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
            console.log(json.slice(0, 5));
        }
    } catch (e) {
        console.error("Error reading file", e);
    }
}

loadFile("/Users/viniciussaldanharosario/Downloads/nacionalhidro-main/PLANO CONTAS NACIONAL HIDROSANEAMENTO EXCEL.xls");
loadFile("/Users/viniciussaldanharosario/Downloads/nacionalhidro-main/PLANO DE CONTAS NACIONAL LOCAÇÃO.excel.xls");
