// lib/validations/vehicle.ts
import { z } from 'zod';

export const vehicleSchema = z.object({
  // Basic Info
  regNumber: z.string().min(3, 'Registration number is required'),
  model: z.string().min(1, 'Model is required'),
  make: z.string().min(1, 'Make is required'),
  year: z.number().int().min(1900).max(new Date().getFullYear() + 1),
  color: z.string().optional().nullable(),
  chassisNumber: z.string().optional().nullable(),
  engineNumber: z.string().optional().nullable(),
  
  // Insurance
  insuranceProvider: z.string().optional().nullable(),
  insurancePolicyNo: z.string().optional().nullable(),
  insuranceExpiry: z.string().transform(str => new Date(str)),
  insuranceCoverType: z.string().optional().nullable(),
  insurancePremium: z.number().optional().nullable(),
  
  // License
  licenseExpiry: z.string().optional().nullable().transform(str => str ? new Date(str) : null),
  licenseNumber: z.string().optional().nullable(),
  
  // Service
  lastServiceDate: z.string().optional().nullable().transform(str => str ? new Date(str) : null),
  lastServiceOdometer: z.number().optional().nullable(),
  nextServiceDate: z.string().optional().nullable().transform(str => str ? new Date(str) : null),
  nextServiceOdometer: z.number().optional().nullable(),
  serviceIntervalKm: z.number().optional().nullable().default(5000),
  serviceIntervalMonths: z.number().optional().nullable().default(6),
  
  // Odometer
  currentOdometer: z.number().default(0),
  
  // Fuel
  fuelType: z.string().optional().nullable(),
  fuelTankCapacity: z.number().optional().nullable(),
  avgFuelConsumption: z.number().optional().nullable(),
  
  // Financial
  purchaseDate: z.string().optional().nullable().transform(str => str ? new Date(str) : null),
  purchasePrice: z.number().optional().nullable(),
  currentValue: z.number().optional().nullable(),
  dailyTarget: z.number().optional().nullable().default(5000),
  monthlyTarget: z.number().optional().nullable(),
  
  // Technical
  engineCapacity: z.string().optional().nullable(),
  transmission: z.string().optional().nullable(),
  fuelEfficiency: z.number().optional().nullable(),
  seatingCapacity: z.number().optional().nullable().default(14),
  
  // Additional
  notes: z.string().optional().nullable(),
});

export type VehicleInput = z.infer<typeof vehicleSchema>;

// For updates (all fields optional)
export const vehicleUpdateSchema = vehicleSchema.partial().extend({
  status: z.enum(['ACTIVE', 'MAINTENANCE', 'INACTIVE', 'OUT_OF_SERVICE']).optional(),
  driverId: z.string().optional().nullable(),
});

export type VehicleUpdateInput = z.infer<typeof vehicleUpdateSchema>;