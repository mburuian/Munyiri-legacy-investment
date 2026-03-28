// app/api/admin/drivers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { verifyAuth } from '../../../../lib/firebase/admin';
import { DriverStatus, Prisma } from '@prisma/client';
import { z } from 'zod';

// Constants
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;
const CACHE_TTL = 60 * 1000; // 1 minute

// Validation schemas - FIXED to handle null values
const driverQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1).nullable().optional(),
  limit: z.coerce.number().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE).nullable().optional(),
  status: z.string().nullable().optional(),
  search: z.string().nullable().optional(),
  sortBy: z.enum(['name', 'createdAt', 'trips', 'revenue']).default('name').nullable().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc').nullable().optional(),
  assigned: z.enum(['assigned', 'unassigned']).nullable().optional(),
}).transform((val) => ({
  page: val.page ?? 1,
  limit: val.limit ?? DEFAULT_PAGE_SIZE,
  status: val.status ?? undefined,
  search: val.search ?? undefined,
  sortBy: val.sortBy ?? 'name',
  sortOrder: val.sortOrder ?? 'asc',
  assigned: val.assigned ?? undefined,
}));

const driverCreateSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  licenseNumber: z.string().min(5),
  status: z.enum(['active', 'off-duty', 'on-leave', 'suspended', 'terminated']).default('off-duty'),
  vehicleId: z.string().optional(),
  password: z.string().min(6).optional(),
});

const driverUpdateSchema = z.object({
  id: z.string(),
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  licenseNumber: z.string().min(5).optional(),
  status: z.enum(['active', 'off-duty', 'on-leave', 'suspended', 'terminated']).optional(),
  vehicleId: z.string().nullable().optional(),
});

// Helper function to map status string to enum
const statusMap: Record<string, DriverStatus> = {
  'active': 'ACTIVE',
  'off-duty': 'OFF_DUTY',
  'on-leave': 'ON_LEAVE',
  'suspended': 'SUSPENDED',
  'terminated': 'TERMINATED'
};

// Helper function to build where clause
function buildWhereClause(params: {
  status?: string;
  search?: string;
  assigned?: string;
}): Prisma.DriverWhereInput {
  const where: Prisma.DriverWhereInput = {};

  if (params.status && params.status !== 'all') {
    const enumStatus = statusMap[params.status.toLowerCase()];
    if (enumStatus) {
      where.status = enumStatus;
    }
  }

  if (params.assigned === 'assigned') {
    where.assignedVehicle = { isNot: null };
  } else if (params.assigned === 'unassigned') {
    where.assignedVehicle = { is: null };
  }

  if (params.search) {
    where.OR = [
      { user: { name: { contains: params.search } } },
      { user: { email: { contains: params.search } } },
      { user: { phone: { contains: params.search } } },
      { licenseNumber: { contains: params.search } }
    ];
  }

  return where;
}

// Helper function to build orderBy
function buildOrderBy(sortBy: string, sortOrder: 'asc' | 'desc'): Prisma.DriverOrderByWithRelationInput {
  if (sortBy === 'name') {
    return { user: { name: sortOrder } };
  }
  return { createdAt: sortOrder };
}

// Helper function to transform driver for frontend
function transformDriver(driver: any) {
  const latestMetrics = driver.performanceMetrics?.[0] || null;
  
  return {
    id: driver.id,
    userId: driver.userId,
    name: driver.user?.name || 'Unknown',
    email: driver.user?.email || '',
    phone: driver.user?.phone || '',
    avatar: driver.user?.avatar,
    licenseNumber: driver.licenseNumber,
    status: driver.status.toLowerCase(),
    createdAt: driver.createdAt,
    rating: latestMetrics?.rating || null,
    tripsCompleted: latestMetrics?.tripsCount || 0,
    totalRevenue: latestMetrics?.totalIncome || 0,
    assignedVehicle: driver.assignedVehicle ? {
      id: driver.assignedVehicle.id,
      plateNumber: driver.assignedVehicle.plateNumber,
      model: driver.assignedVehicle.model,
      capacity: driver.assignedVehicle.capacity,
      status: driver.assignedVehicle.status
    } : null
  };
}

// GET endpoint with caching
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const auth = await verifyAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const searchParams = request.nextUrl.searchParams;
    
    // Parse parameters with proper null handling
    const validatedParams = driverQuerySchema.parse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      status: searchParams.get('status'),
      search: searchParams.get('search'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder'),
      assigned: searchParams.get('assigned'),
    });

    const { page, limit, sortBy, sortOrder, ...filters } = validatedParams;
    const skip = (page - 1) * limit;

    // Build queries
    const where = buildWhereClause(filters);
    const orderBy = buildOrderBy(sortBy, sortOrder);

    // Execute parallel queries for better performance
    const [drivers, total, summary] = await Promise.all([
      prisma.driver.findMany({
        where,
        include: {
          user: {
            select: {
              name: true,
              email: true,
              phone: true,
              avatar: true
            }
          },
          assignedVehicle: {
            select: {
              id: true,
              plateNumber: true,
              model: true,
              capacity: true,
              status: true
            }
          },
          performanceMetrics: {
            take: 1,
            orderBy: { date: 'desc' },
            select: {
              tripsCount: true,
              totalIncome: true,
              rating: true
            }
          }
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.driver.count({ where }),
      prisma.$transaction([
        prisma.driver.count(),
        prisma.driver.count({ where: { status: 'ACTIVE' } }),
        prisma.driver.count({ where: { status: 'OFF_DUTY' } }),
        prisma.driver.count({ where: { status: 'ON_LEAVE' } }),
        prisma.driver.count({ where: { status: 'SUSPENDED' } }),
        prisma.driver.count({ where: { status: 'TERMINATED' } }),
        prisma.driver.count({ where: { assignedVehicle: { isNot: null } } }),
        prisma.driver.count({ where: { assignedVehicle: { is: null } } })
      ])
    ]);

    const [totalDrivers, activeDrivers, offDutyDrivers, onLeaveDrivers, suspendedDrivers, terminatedDrivers, assignedDrivers, unassignedDrivers] = summary;

    const transformedDrivers = drivers.map(transformDriver);

    const response = {
      drivers: transformedDrivers,
      summary: {
        totalDrivers,
        activeDrivers,
        offDutyDrivers,
        onLeaveDrivers,
        suspendedDrivers,
        terminatedDrivers,
        assignedDrivers,
        unassignedDrivers
      },
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      meta: {
        responseTime: Date.now() - startTime
      }
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': `public, s-maxage=${CACHE_TTL / 1000}, stale-while-revalidate=${CACHE_TTL / 1000 * 2}`,
        'X-Response-Time': `${Date.now() - startTime}ms`
      }
    });
  } catch (error: any) {
    console.error('Error fetching drivers:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.issues },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to fetch drivers' },
      { status: 500 }
    );
  }
}

// POST endpoint - Create driver
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const auth = await verifyAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const validatedData = driverCreateSchema.parse(body);

    const result = await prisma.$transaction(async (tx) => {
      // Check if vehicle exists and is available
      if (validatedData.vehicleId) {
        const vehicle = await tx.vehicle.findUnique({
          where: { id: validatedData.vehicleId },
          select: { driverId: true }
        });
        
        if (!vehicle) {
          throw new Error('Vehicle not found');
        }
        if (vehicle.driverId) {
          throw new Error('Vehicle is already assigned to another driver');
        }
      }

      // Create or update user
      const user = await tx.user.upsert({
        where: { email: validatedData.email },
        update: {
          name: validatedData.name,
          phone: validatedData.phone,
          role: 'DRIVER'
        },
        create: {
          email: validatedData.email,
          name: validatedData.name,
          phone: validatedData.phone || null,
          password: validatedData.password || 'temporary_password',
          role: 'DRIVER'
        }
      });

      // Create driver record
      const driver = await tx.driver.create({
        data: {
          userId: user.id,
          licenseNumber: validatedData.licenseNumber,
          status: statusMap[validatedData.status],
          ...(validatedData.vehicleId && {
            assignedVehicle: {
              connect: { id: validatedData.vehicleId }
            }
          })
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
              phone: true,
              avatar: true
            }
          },
          assignedVehicle: {
            select: {
              id: true,
              plateNumber: true,
              model: true,
              capacity: true,
              status: true
            }
          }
        }
      });

      // Create initial performance metrics
      await tx.performanceMetrics.create({
        data: {
          driverId: driver.id,
          date: new Date(),
          tripsCount: 0,
          totalIncome: 0,
          totalExpenses: 0,
          netProfit: 0
        }
      });

      // If vehicle was assigned, update vehicle's driverId
      if (validatedData.vehicleId) {
        await tx.vehicle.update({
          where: { id: validatedData.vehicleId },
          data: { driverId: driver.id }
        });
      }

      return driver;
    });

    const transformedDriver = transformDriver(result);

    return NextResponse.json(transformedDriver, {
      status: 201,
      headers: {
        'X-Response-Time': `${Date.now() - startTime}ms`
      }
    });
  } catch (error: any) {
    console.error('Error creating driver:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A driver with this license number or email already exists' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to create driver' },
      { status: 500 }
    );
  }
}

// PUT endpoint - Update driver
export async function PUT(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const auth = await verifyAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const validatedData = driverUpdateSchema.parse(body);

    const result = await prisma.$transaction(async (tx) => {
      const currentDriver = await tx.driver.findUnique({
        where: { id: validatedData.id },
        include: { assignedVehicle: true }
      });

      if (!currentDriver) {
        throw new Error('Driver not found');
      }

      // Handle vehicle assignment changes
      if (validatedData.vehicleId !== undefined) {
        const currentVehicleId = currentDriver.assignedVehicle?.id;
        
        if (validatedData.vehicleId === null && currentVehicleId) {
          await tx.vehicle.update({
            where: { id: currentVehicleId },
            data: { driverId: null }
          });
        }
        
        if (validatedData.vehicleId && validatedData.vehicleId !== currentVehicleId) {
          const targetVehicle = await tx.vehicle.findUnique({
            where: { id: validatedData.vehicleId },
            select: { driverId: true }
          });
          
          if (!targetVehicle) {
            throw new Error('Vehicle not found');
          }
          if (targetVehicle.driverId && targetVehicle.driverId !== validatedData.id) {
            throw new Error('Vehicle is already assigned to another driver');
          }
          
          await tx.vehicle.update({
            where: { id: validatedData.vehicleId },
            data: { driverId: validatedData.id }
          });
        }
      }

      // Update user if needed
      if (validatedData.name || validatedData.email || validatedData.phone) {
        await tx.user.update({
          where: { id: currentDriver.userId },
          data: {
            ...(validatedData.name && { name: validatedData.name }),
            ...(validatedData.email && { email: validatedData.email }),
            ...(validatedData.phone && { phone: validatedData.phone })
          }
        });
      }

      // Update driver
      const driver = await tx.driver.update({
        where: { id: validatedData.id },
        data: {
          ...(validatedData.licenseNumber && { licenseNumber: validatedData.licenseNumber }),
          ...(validatedData.status && { status: statusMap[validatedData.status] }),
          ...(validatedData.vehicleId !== undefined && {
            assignedVehicle: validatedData.vehicleId
              ? { connect: { id: validatedData.vehicleId } }
              : { disconnect: true }
          })
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
              phone: true,
              avatar: true
            }
          },
          assignedVehicle: {
            select: {
              id: true,
              plateNumber: true,
              model: true,
              capacity: true,
              status: true
            }
          },
          performanceMetrics: {
            take: 1,
            orderBy: { date: 'desc' }
          }
        }
      });

      return driver;
    });

    const transformedDriver = transformDriver(result);

    return NextResponse.json(transformedDriver, {
      headers: {
        'X-Response-Time': `${Date.now() - startTime}ms`
      }
    });
  } catch (error: any) {
    console.error('Error updating driver:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to update driver' },
      { status: 500 }
    );
  }
}

// DELETE endpoint - Delete driver
export async function DELETE(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const auth = await verifyAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Driver ID is required' },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      const driver = await tx.driver.findUnique({
        where: { id },
        include: { assignedVehicle: true }
      });

      if (!driver) {
        throw new Error('Driver not found');
      }

      if (driver.assignedVehicle) {
        await tx.vehicle.update({
          where: { id: driver.assignedVehicle.id },
          data: { driverId: null }
        });
      }

      await tx.driver.delete({
        where: { id }
      });
    });

    return NextResponse.json({ 
      success: true,
      meta: {
        responseTime: Date.now() - startTime
      }
    });
  } catch (error: any) {
    console.error('Error deleting driver:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete driver' },
      { status: 500 }
    );
  }
}