import { z } from 'zod';

export const driverSchema = z.object({
  // Personal Information
  name: z.string().min(3, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Valid phone number required'),
  idNumber: z.string().min(5, 'ID/Passport number required'),
  dateOfBirth: z.string().transform(str => new Date(str)),
  gender: z.enum(['male', 'female', 'other']),
  
  // License Information
  licenseNumber: z.string().min(5, 'License number required'),
  licenseClass: z.enum(['A', 'B', 'C', 'D', 'E', 'CE', 'D1', 'D2', 'D3']),
  licenseIssueDate: z.string().transform(str => new Date(str)),
  licenseExpiryDate: z.string().transform(str => new Date(str)),
  licenseIssuingAuthority: z.string().min(2, 'Issuing authority required'),
  
  // Employment Details
  employeeId: z.string().min(3, 'Employee ID required'),
  hireDate: z.string().transform(str => new Date(str)),
  employmentType: z.enum(['full-time', 'part-time', 'contract']),
  
  // Assigned Vehicle
  assignedVehicleId: z.string().optional().nullable(),
  
  // Medical Information
  bloodGroup: z.string().optional(),
  medicalConditions: z.string().optional(),
  emergencyContactName: z.string().min(3, 'Emergency contact name required'),
  emergencyContactPhone: z.string().min(10, 'Emergency contact phone required'),
  
  // Additional
  address: z.string().min(5, 'Address required'),
  nextOfKin: z.string().min(3, 'Next of kin name required'),
  nextOfKinPhone: z.string().min(10, 'Next of kin phone required'),
  notes: z.string().optional(),
});

export type DriverInput = z.infer<typeof driverSchema>;

export const driverUpdateSchema = driverSchema.partial().extend({
  status: z.enum(['active', 'off-duty', 'on-leave', 'suspended', 'terminated']).optional(),
  rating: z.number().min(0).max(5).optional(),
  totalTrips: z.number().optional(),
  totalRevenue: z.number().optional(),
});

export type DriverUpdateInput = z.infer<typeof driverUpdateSchema>;