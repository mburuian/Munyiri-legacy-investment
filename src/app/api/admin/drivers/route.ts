// app/api/admin/drivers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { verifyAuth } from '../..//../../lib/firebase/admin';
import { DriverStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'name';
    const sortOrder = searchParams.get('sortOrder') || 'asc';
    const assigned = searchParams.get('assigned');

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    // Map status string to enum value
    if (status && status !== 'all') {
      const statusMap: Record<string, DriverStatus> = {
        'active': 'ACTIVE',
        'off-duty': 'OFF_DUTY',
        'on-leave': 'ON_LEAVE',
        'suspended': 'SUSPENDED',
        'terminated': 'TERMINATED'
      };
      where.status = statusMap[status.toLowerCase()];
    }

    if (assigned === 'assigned') {
      where.assignedVehicle = { isNot: null };
    } else if (assigned === 'unassigned') {
      where.assignedVehicle = { is: null };
    }

    if (search) {
      where.OR = [
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { phone: { contains: search, mode: 'insensitive' } } },
        { licenseNumber: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Get performance metrics for sorting if needed
    let orderBy: any = {};
    if (sortBy === 'name') {
      orderBy = { user: { name: sortOrder } };
    } else {
      // Default sorting by creation date
      orderBy = { createdAt: sortOrder };
    }

    // Get drivers with pagination
    const [drivers, total] = await Promise.all([
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
          // Include recent performance metrics
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
        take: limit
      }),
      prisma.driver.count({ where })
    ]);

    // Get summary statistics
    const [
      totalDrivers,
      activeDrivers,
      offDutyDrivers,
      onLeaveDrivers,
      suspendedDrivers,
      terminatedDrivers,
      assignedDrivers,
      unassignedDrivers
    ] = await Promise.all([
      prisma.driver.count(),
      prisma.driver.count({ where: { status: 'ACTIVE' as DriverStatus } }),
      prisma.driver.count({ where: { status: 'OFF_DUTY' as DriverStatus } }),
      prisma.driver.count({ where: { status: 'ON_LEAVE' as DriverStatus } }),
      prisma.driver.count({ where: { status: 'SUSPENDED' as DriverStatus } }),
      prisma.driver.count({ where: { status: 'TERMINATED' as DriverStatus } }),
      prisma.driver.count({ where: { assignedVehicle: { isNot: null } } }),
      prisma.driver.count({ where: { assignedVehicle: { is: null } } })
    ]);

    const summary = {
      totalDrivers,
      activeDrivers,
      offDutyDrivers,
      onLeaveDrivers,
      suspendedDrivers,
      terminatedDrivers,
      assignedDrivers,
      unassignedDrivers
    };

    // Transform the response for frontend
    const transformedDrivers = drivers.map(driver => {
      const latestMetrics = driver.performanceMetrics[0] || null;
      
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
        // From performance metrics
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
    });

    return NextResponse.json({
      drivers: transformedDrivers,
      summary,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error('Error fetching drivers:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch drivers' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    
    // Map status to uppercase enum value
    const statusMap: Record<string, DriverStatus> = {
      'active': 'ACTIVE',
      'off-duty': 'OFF_DUTY',
      'on-leave': 'ON_LEAVE',
      'suspended': 'SUSPENDED',
      'terminated': 'TERMINATED'
    };

    // First, create or get the user
    const user = await prisma.user.upsert({
      where: { email: body.email },
      update: {
        name: body.name,
        phone: body.phone,
        role: 'DRIVER'
      },
      create: {
        email: body.email,
        name: body.name,
        phone: body.phone,
        password: body.password || 'temporary_password', // You should hash this
        role: 'DRIVER'
      }
    });

    // Then create the driver record
    const driver = await prisma.driver.create({
      data: {
        userId: user.id,
        licenseNumber: body.licenseNumber,
        status: statusMap[body.status?.toLowerCase()] || 'OFF_DUTY',
        // Only include if vehicle exists and is not assigned
        ...(body.vehicleId && {
          assignedVehicle: {
            connect: { id: body.vehicleId }
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

    // Create initial performance metrics record
    await prisma.performanceMetrics.create({
      data: {
        driverId: driver.id,
        date: new Date(),
        tripsCount: 0,
        totalIncome: 0,
        totalExpenses: 0,
        netProfit: 0
      }
    });

    // Transform response
    const transformedDriver = {
      id: driver.id,
      userId: driver.userId,
      name: driver.user?.name,
      email: driver.user?.email,
      phone: driver.user?.phone,
      avatar: driver.user?.avatar,
      licenseNumber: driver.licenseNumber,
      status: driver.status.toLowerCase(),
      createdAt: driver.createdAt,
      rating: null,
      tripsCompleted: 0,
      totalRevenue: 0,
      assignedVehicle: driver.assignedVehicle ? {
        id: driver.assignedVehicle.id,
        plateNumber: driver.assignedVehicle.plateNumber,
        model: driver.assignedVehicle.model,
        capacity: driver.assignedVehicle.capacity,
        status: driver.assignedVehicle.status
      } : null
    };

    return NextResponse.json(transformedDriver, { status: 201 });
  } catch (error: any) {
    console.error('Error creating driver:', error);
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A driver with this license number or user already exists' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to create driver' },
      { status: 500 }
    );
  }
}

// Optional: Add PUT endpoint for updating drivers
export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Driver ID is required' },
        { status: 400 }
      );
    }

    // Map status if provided
    const statusMap: Record<string, DriverStatus> = {
      'active': 'ACTIVE',
      'off-duty': 'OFF_DUTY',
      'on-leave': 'ON_LEAVE',
      'suspended': 'SUSPENDED',
      'terminated': 'TERMINATED'
    };

    const driver = await prisma.driver.update({
      where: { id },
      data: {
        ...(updateData.licenseNumber && { licenseNumber: updateData.licenseNumber }),
        ...(updateData.status && { status: statusMap[updateData.status.toLowerCase()] }),
        // Handle vehicle assignment
        ...(updateData.vehicleId && {
          assignedVehicle: {
            connect: { id: updateData.vehicleId }
          }
        }),
        ...(updateData.vehicleId === null && {
          assignedVehicle: {
            disconnect: true
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
        },
        performanceMetrics: {
          take: 1,
          orderBy: { date: 'desc' }
        }
      }
    });

    const latestMetrics = driver.performanceMetrics[0] || null;

    const transformedDriver = {
      id: driver.id,
      userId: driver.userId,
      name: driver.user?.name,
      email: driver.user?.email,
      phone: driver.user?.phone,
      avatar: driver.user?.avatar,
      licenseNumber: driver.licenseNumber,
      status: driver.status.toLowerCase(),
      createdAt: driver.createdAt,
      rating: latestMetrics?.rating || null,
      tripsCompleted: latestMetrics?.tripsCount || 0,
      totalRevenue: latestMetrics?.totalIncome || 0,
      assignedVehicle: driver.assignedVehicle
    };

    return NextResponse.json(transformedDriver);
  } catch (error: any) {
    console.error('Error updating driver:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update driver' },
      { status: 500 }
    );
  }
}

// Optional: Add DELETE endpoint
export async function DELETE(request: NextRequest) {
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

    // Delete driver (this will cascade to related records due to onDelete: Cascade)
    await prisma.driver.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting driver:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete driver' },
      { status: 500 }
    );
  }
}