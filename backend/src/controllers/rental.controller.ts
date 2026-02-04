import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

// Properties
export const listProperties = async (req: AuthRequest, res: Response) => {
  try {
    const properties = await prisma.property.findMany();
    res.json(properties);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch properties' });
  }
};

export const createProperty = async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, price, address, type } = req.body;
    
    const property = await prisma.property.create({
      data: {
        title,
        description,
        price,
        address,
        type
      }
    });

    res.status(201).json(property);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create property' });
  }
};

// Contracts
export const listContracts = async (req: AuthRequest, res: Response) => {
  try {
    const contracts = await prisma.contract.findMany({
      include: { property: true }
    });
    res.json(contracts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch contracts' });
  }
};

export const createContract = async (req: AuthRequest, res: Response) => {
  try {
    const { propertyId, renterName, monthlyValue, startDate, endDate, renterEmail, renterPhone } = req.body;
    
    const contract = await prisma.contract.create({
      data: {
        propertyId,
        renterName,
        monthlyValue,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        renterEmail,
        renterPhone,
        status: 'ACTIVE'
      }
    });

    // Update property status
    await prisma.property.update({
      where: { id: propertyId },
      data: { status: 'RENTED' }
    });

    res.status(201).json(contract);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create contract' });
  }
};
