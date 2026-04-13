import path from 'path';
import fs from 'fs';
import { gerarPdfFichaRegistro } from './legacyPdf.service';

/**
 * Gera a Ficha de Registro de Empregado (FRE) em PDF para conformidade com o Ministério do Trabalho.
 * Substitui a antiga geração em Excel que era muito básica.
 */
export async function gerarFichaAdmissao(admissao: any) {
    try {
        const pdfBuffer = await gerarPdfFichaRegistro(admissao);

        const fileName = `Ficha_Registro_${admissao.id}_${Date.now()}.pdf`;
        
        // Usar public/uploads para que seja acessível via web
        const uploadDir = path.join(process.cwd(), 'public/uploads/admissoes');
        
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const filePath = path.join(uploadDir, fileName);
        fs.writeFileSync(filePath, pdfBuffer);

        return {
            nome: 'Ficha de Registro de Empregado.pdf',
            url: `/uploads/admissoes/${fileName}`,
            status: 'CONCLUIDO'
        };
    } catch (error) {
        console.error('Erro ao gerar ficha de registro PDF:', error);
        throw error;
    }
}
