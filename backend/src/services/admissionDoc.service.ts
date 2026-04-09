import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

export async function gerarFichaAdmissao(admissao: any) {
    try {
        const data = [
            ['FICHA DE ADMISSÃO - NACIONAL HIDRO'],
            [''],
            ['DADOS PESSOAIS'],
            ['Nome:', admissao.nome],
            ['CPF:', admissao.cpf || 'Não informado'],
            ['E-mail:', admissao.email || 'Não informado'],
            ['Telefone:', admissao.telefone || 'Não informado'],
            [''],
            ['DADOS CONTRATUAIS'],
            ['Cargo:', admissao.cargo || 'Não informado'],
            ['Departamento:', admissao.departamento || 'Não informado'],
            ['Data Admissão Prevista:', admissao.dataAdmissaoPrevista ? new Date(admissao.dataAdmissaoPrevista).toLocaleDateString('pt-BR') : 'Não informada'],
            ['Salário Base:', admissao.salarioBase ? `R$ ${admissao.salarioBase.toFixed(2)}` : 'Não informado'],
            [''],
            ['ETAPA ATUAL:', admissao.etapa],
            ['IMPRESSO EM:', new Date().toLocaleString('pt-BR')],
        ];

        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.aoa_to_sheet(data);

        // Adjust column widths
        worksheet['!cols'] = [{ wch: 25 }, { wch: 50 }];

        XLSX.utils.book_append_sheet(workbook, worksheet, 'Ficha_Admissao');

        const fileName = `Ficha_Admissao_${admissao.id}.xlsx`;
        const uploadDir = path.join(__dirname, '../../uploads/admissoes');
        
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const filePath = path.join(uploadDir, fileName);
        XLSX.writeFile(workbook, filePath);

        return {
            nome: 'Ficha de Admissão Automática.xlsx',
            url: `/uploads/admissoes/${fileName}`,
            status: 'CONCLUIDO'
        };
    } catch (error) {
        console.error('Erro ao gerar ficha de admissão:', error);
        throw error;
    }
}
