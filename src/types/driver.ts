// types/driver.ts
export interface Driver {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  licenseNumber: string | null;
  licenseExpiryDate: Date | string | null;
  status: string;
  rating: number;
  tripsCompleted: number;
  totalRevenue: number;
  vehicleId: string | null;
  assignedVehicle?: {
    id: string;
    regNumber: string;
    model: string;
    make: string;
    year: number;
  } | null;
  avatar?: string | null;
  
  // Additional fields from your schema
  employeeId?: string | null;
  hireDate?: Date | string | null;
  employmentType?: string | null;
  idNumber?: string | null;
  dateOfBirth?: Date | string | null;
  gender?: string | null;
  address?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  nextOfKin?: string | null;
  nextOfKinPhone?: string | null;
  bloodGroup?: string | null;
  medicalConditions?: string | null;
}

export interface DriverFilters {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  assigned?: 'assigned' | 'unassigned' | 'all';
}

export interface DriverStats {
  totalDrivers: number;
  activeDrivers: number;
  onLeaveDrivers: number;
  suspendedDrivers: number;
  assignedDrivers: number;
  unassignedDrivers: number;
  averageRating: number;
  topPerformers: Driver[];
  licenseExpiringSoon: Driver[];
}

export interface DriverSummary {
  totalDrivers: number;
  activeDrivers: number;
  onLeaveDrivers: number;
  suspendedDrivers: number;
  assignedDrivers: number;
  unassignedDrivers: number;
  averageRating: number;
}