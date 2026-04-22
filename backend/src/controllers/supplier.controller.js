import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

const supplierSchema = z.object({
  name:          z.string().min(1),
  category:      z.enum(['coffee','milk','food','packaging','equipment','cleaning','other']),
  contactPerson: z.string().optional().nullable(),
  phone:         z.string().optional().nullable(),
  email:         z.string().email().optional().nullable().or(z.literal('')),
  address:       z.string().optional().nullable(),
  paymentTerms:  z.string().optional().nullable(),
  notes:         z.string().optional().nullable(),
  lastOrderDate: z.string().optional().nullable(),
});

export async function getSuppliers(req, res, next) {
  try {
    const { category } = req.query;
    const where = {};
    if (category) where.category = category;
    const suppliers = await prisma.supplier.findMany({
      where,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
    res.json({ data: suppliers });
  } catch (err) { next(err); }
}

export async function createSupplier(req, res, next) {
  try {
    const data = supplierSchema.parse(req.body);
    const supplier = await prisma.supplier.create({
      data: {
        ...data,
        email: data.email || null,
        lastOrderDate: data.lastOrderDate ? new Date(data.lastOrderDate) : null,
      },
    });
    res.status(201).json({ data: supplier });
  } catch (err) { next(err); }
}

export async function updateSupplier(req, res, next) {
  try {
    const data = supplierSchema.partial().parse(req.body);
    const supplier = await prisma.supplier.update({
      where: { id: req.params.id },
      data: {
        ...data,
        email: data.email !== undefined ? (data.email || null) : undefined,
        lastOrderDate: data.lastOrderDate !== undefined
          ? (data.lastOrderDate ? new Date(data.lastOrderDate) : null)
          : undefined,
      },
    });
    res.json({ data: supplier });
  } catch (err) { next(err); }
}

export async function deleteSupplier(req, res, next) {
  try {
    await prisma.supplier.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { next(err); }
}
