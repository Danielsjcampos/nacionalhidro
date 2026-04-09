import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
    const filePath = '/tmp/veiculos.csv';
    const csvContent = fs.readFileSync(filePath, 'utf-8');
    const lines = csvContent.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('ID'));

    console.log('Replacing existing vehicles with real fleet...');

    // Delete existing Escalas and Manutencoes first to avoid foreign key errors
    console.log('Cleaning up related Escala and Manutencao records...');
    await prisma.escala.deleteMany({});
    await prisma.manutencao.deleteMany({});
    await prisma.veiculo.deleteMany({});
    console.log('Cleaned up existing vehicles.');

    const mappedVehicles: any[] = [];

    for (const line of lines) {
        // Basic CSV parsing treating quotes
        const regex = /(?:\"([^\"]*)\")|([^,]+)/g;
        let match;
        const parts = [];
        while ((match = regex.exec(line)) !== null) {
            if (match[1] !== undefined) parts.push(match[1]);
            else parts.push(match[2]);
        }

        if (parts.length >= 4) {
            /*
            0: ID
            1: Veículo (Modelo/Descricao)
            2: Placa
            3: Tipo
            4: Manutenção
            */
            const rawPlaca = parts[2].trim();
            let placa = rawPlaca || `SEM-PLACA-${parts[0]}`; // fallback if empty
            // Just keep first placa if multiple like DBB8J98/DBB8J99
            if (placa.includes('/')) {
                placa = placa.split('/')[0].trim();
            }

            const veiculo = {
                placa: placa,
                modelo: parts[1].trim(),
                tipo: parts[3]?.trim() || "CARRO",
                status: parts[4] === "Sim" ? "MANUTENCAO" : "DISPONIVEL",
                kmAtual: 0,
                nivelCombustivel: 100
            };

            mappedVehicles.push(veiculo);
        }
    }

    // Insert uniquely since there might be duplicate placas in bad data
    const finalVehicles = [];
    const placas = new Set();
    for (const v of mappedVehicles) {
        if (!placas.has(v.placa)) {
            finalVehicles.push(v);
            placas.add(v.placa);
        } else {
            console.log(`Skipping duplicate placa: ${v.placa}`);
        }
    }

    await prisma.veiculo.createMany({
        data: finalVehicles
    });

    console.log(`Successfully seeded ${finalVehicles.length} vehicles!`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
