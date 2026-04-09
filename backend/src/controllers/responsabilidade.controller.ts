import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const getResponsabilidades = async (req: Request, res: Response) => {
    try {
        const responsabilidades = await prisma.responsabilidadePadrao.findMany({
            orderBy: { descricao: 'asc' },
        });
        res.json(responsabilidades);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar responsabilidades' });
    }
};

export const createResponsabilidade = async (req: Request, res: Response) => {
    try {
        const { descricao, tipo } = req.body;
        const responsabilidade = await prisma.responsabilidadePadrao.create({
            data: { descricao, tipo },
        });
        res.status(201).json(responsabilidade);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao criar responsabilidade' });
    }
};

export const updateResponsabilidade = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const { descricao, tipo } = req.body;
        const responsabilidade = await prisma.responsabilidadePadrao.update({
            where: { id },
            data: { descricao, tipo },
        });
        res.json(responsabilidade);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar responsabilidade' });
    }
};

export const deleteResponsabilidade = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        await prisma.responsabilidadePadrao.delete({
            where: { id },
        });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Erro ao deletar responsabilidade' });
    }
};
