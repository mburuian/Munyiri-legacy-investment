// app/api/admin/vehicles/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';  // Fixed import path
import { verifyAuth } from '../../../../lib/firebase/admin';  // Fixed import path
import { VehicleStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const auth = await verifyAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json(
        { error: auth.error }, 
        { status: auth.status }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const driverId = searchParams.get('driverId');

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (status && status !== 'all') {
      where.status = status;
    }

    if (driverId) {
      where.driverId = driverId;
    }

    if (search) {
      where.OR = [
        { plateNumber: { contains: search, mode: 'insensitive' } }, // Fixed: regNumber -> plateNumber
        { model: { contains: search, mode: 'insensitive' } }
        // Removed 'make' as it doesn't exist in schema
      ];
    }

    // Get vehicles with pagination
    const [vehicles, total] = await Promise.all([
      prisma.vehicle.findMany({
        where,
        include: {
          driver: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                  phone: true
                }
              }
            }
          },
          _count: {
            select: {
              incomeLogs: true,
              expenses: true,
              maintenance: true,  // Fixed: changed from maintenanceLogs
              alerts: {
                where: { resolved: false }
              },
              trips: true,        // Added missing relations
              documents: true
            }
          }
        },
        orderBy: { id: 'desc' },
        skip,
        take: limit
      }),
      prisma.vehicle.count({ where })
    ]);

    // Get summary statistics (removed fields that don't exist in schema)
    const summary = {
      total: await prisma.vehicle.count(),
      active: await prisma.vehicle.count({ where: { status: 'ACTIVE' as VehicleStatus } }),
      maintenance: await prisma.vehicle.count({ where: { status: 'MAINTENANCE' as VehicleStatus } }),
      inactive: await prisma.vehicle.count({ where: { status: 'INACTIVE' as VehicleStatus } }),
      outOfService: await prisma.vehicle.count({ where: { status: 'OUT_OF_SERVICE' as VehicleStatus } }),
      assigned: await prisma.vehicle.count({ where: { driverId: { not: null } } })
      // Removed insuranceExpiring and serviceDue as they don't exist in schema
    };

    return NextResponse.json({
      vehicles,
      summary,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error('Error fetching vehicles:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch vehicles' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const auth = await verifyAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json(
        { error: auth.error }, 
        { status: auth.status }
      );
    }

    // Parse request body
    const body = await request.json();
    
    // Map ONLY fields that exist in your schema
    const vehicleData = {
      plateNumber: body.plateNumber || body.regNumber,  // Use plateNumber as per schema
      model: body.model,
      capacity: body.capacity ? parseInt(body.capacity) : 14,
      status: (body.status?.toUpperCase() as VehicleStatus) || 'ACTIVE',
      // Only set driverId if provided and valid
      ...(body.driverId && { driverId: body.driverId })
    };

    // Check for duplicate plate number
    const existing = await prisma.vehicle.findUnique({
      where: { plateNumber: vehicleData.plateNumber }
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Vehicle with this plate number already exists' },
        { status: 400 }
      );
    }

    // Create vehicle
    const vehicle = await prisma.vehicle.create({
      data: vehicleData,
      include: {
        driver: {
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json(vehicle, { status: 201 });
  } catch (error: any) {
    if (error.name === 'PrismaClientValidationError') {
      console.error('Prisma validation error:', error.message);
      return NextResponse.json(
        { error: 'Database validation error', details: error.message },
        { status: 400 }
      );
    }
    
    console.error('Error creating vehicle:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create vehicle' },
      { status: 500 }
    );
  }
}