import { getDisponibilidade } from './src/controllers/rh.controller';
import { Request, Response } from 'express';

const req = { query: { data: '2026-04-28' } } as unknown as Request;
const res = { 
  json: (data: any) => console.log('JSON:', data),
  status: (code: number) => ({ json: (data: any) => console.log(`STATUS ${code}:`, data) })
} as unknown as Response;

getDisponibilidade(req, res).catch(console.error);
