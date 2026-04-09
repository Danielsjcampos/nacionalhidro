import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const getAcessorios = async (req: Request, res: Response) => {
    try {
        const acessorios = await prisma.acessorio.findMany({
            orderBy: { nome: 'asc' },
        });
        res.json(acessorios);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar acessórios' });
    }
};

export const createAcessorio = async (req: Request, res: Response) => {
    try {
        const { nome } = req.body;
        const acessorio = await prisma.acessorio.create({
            data: { nome },
        });
        res.status(201).json(acessorio);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao criar acessório' });
    }
};

export const updateAcessorio = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const { nome } = req.body;
        const acessorio = await prisma.acessorio.update({
            where: { id },
            data: { nome },
        });
        res.json(acessorio);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar acessório' });
    }
};

export const deleteAcessorio = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        await prisma.acessorio.delete({
            where: { id },
        });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Erro ao deletar acessório' });
    }
};
