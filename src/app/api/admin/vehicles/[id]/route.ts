// app/api/admin/vehicles/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { verifyAuth } from '../../../../../lib/firebase/admin';
import { VehicleStatus } from '@prisma/client';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const auth = await verifyAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const vehicle = await prisma.vehicle.findUnique({
      where: { id: params.id },
      include: {
        driver: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
                phone: true,
                avatar: true
              }
            }
          }
        },
        trips: {
          orderBy: { startTime: 'desc' },
          take: 10,
          include: {
            driver: {
              include: {
                user: {
                  select: { name: true }
                }
              }
            }
          }
        },
        maintenance: {
          orderBy: { date: 'desc' },
          take: 10
        },
        incomeLogs: {
          orderBy: { date: 'desc' },
          take: 30
        },
        expenses: {
          orderBy: { date: 'desc' },
          take: 30
        },
        alerts: {
          where: { resolved: false },
          orderBy: { severity: 'desc' }
        },
        documents: {
          orderBy: { uploadedAt: 'desc' },
          take: 10
        }
      }
    });

    if (!vehicle) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    // Calculate summary statistics with proper typing
    const totalIncome = vehicle.incomeLogs?.reduce((sum: number, log: { amount: number }) => sum + log.amount, 0) || 0;
    const totalExpenses = vehicle.expenses?.reduce((sum: number, exp: { amount: number }) => sum + exp.amount, 0) || 0;
    const maintenanceCost = vehicle.maintenance?.reduce((sum: number, maint: { cost: number }) => sum + maint.cost, 0) || 0;

    const summary = {
      totalTrips: vehicle.trips?.length || 0,
      totalIncome,
      totalExpenses,
      maintenanceCost,
      netProfit: totalIncome - totalExpenses,
      activeAlerts: vehicle.alerts?.length || 0,
      lastTrip: vehicle.trips && vehicle.trips.length > 0 ? vehicle.trips[0] : null,
      nextMaintenance: vehicle.maintenance && vehicle.maintenance.length > 0 
        ? vehicle.maintenance.find((m: { status: string }) => m.status === 'PENDING' || m.status === 'IN_PROGRESS') 
        : null
    };

    // Remove the relations from the vehicle object to avoid circular references
    const { trips, maintenance, incomeLogs, expenses, alerts, documents, ...vehicleWithoutRelations } = vehicle;

    return NextResponse.json({
      ...vehicleWithoutRelations,
      summary,
      recentTrips: trips,
      recentMaintenance: maintenance,
      recentIncome: incomeLogs,
      recentExpenses: expenses,
      activeAlerts: alerts,
      recentDocuments: documents
    });
  } catch (error: any) {
    console.error('Error fetching vehicle:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch vehicle' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const auth = await verifyAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if vehicle exists
    const existingVehicle = await prisma.vehicle.findUnique({
      where: { id: params.id },
      include: {
        driver: true
      }
    });

    if (!existingVehicle) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    
    // Build update data
    const updateData: any = {};

    // Basic Info
    if (body.plateNumber !== undefined) {
      // Check for duplicate plate number
      if (body.plateNumber !== existingVehicle.plateNumber) {
        const duplicate = await prisma.vehicle.findUnique({
          where: { plateNumber: body.plateNumber }
        });
        if (duplicate) {
          return NextResponse.json(
            { error: 'Vehicle with this plate number already exists' },
            { status: 400 }
          );
        }
      }
      updateData.plateNumber = body.plateNumber;
    }

    if (body.model !== undefined) updateData.model = body.model;
    if (body.capacity !== undefined) updateData.capacity = parseInt(body.capacity);
    if (body.status !== undefined) updateData.status = body.status as VehicleStatus;

    // Handle driver assignment/unassignment
    if (body.driverId !== undefined) {
      // If assigning a new driver
      if (body.driverId) {
        // Check if driver exists and is not already assigned to another vehicle
        const driver = await prisma.driver.findUnique({
          where: { id: body.driverId },
          include: { assignedVehicle: true }
        });

        if (!driver) {
          return NextResponse.json(
            { error: 'Driver not found' },
            { status: 404 }
          );
        }

        if (driver.assignedVehicle && driver.assignedVehicle.id !== params.id) {
          return NextResponse.json(
            { error: 'Driver is already assigned to another vehicle' },
            { status: 400 }
          );
        }

        updateData.driverId = body.driverId;
      } else {
        // Unassign driver
        updateData.driverId = null;
      }
    }

    // Update vehicle
    const vehicle = await prisma.vehicle.update({
      where: { id: params.id },
      data: updateData,
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
        }
      }
    });

    return NextResponse.json(vehicle);
  } catch (error: any) {
    console.error('Error updating vehicle:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update vehicle' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const auth = await verifyAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if vehicle exists
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: params.id },
      include: {
        driver: true,
        _count: {
          select: {
            trips: true,
            maintenance: true,
            incomeLogs: true,
            expenses: true,
            documents: true,
            alerts: true
          }
        }
      }
    });

    if (!vehicle) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    // If vehicle has related records, soft delete by marking as inactive
    if (vehicle._count.trips > 0 || 
        vehicle._count.maintenance > 0 || 
        vehicle._count.incomeLogs > 0 || 
        vehicle._count.expenses > 0) {
      
      // Soft delete - mark as inactive and unassign driver
      await prisma.vehicle.update({
        where: { id: params.id },
        data: { 
          status: 'INACTIVE' as VehicleStatus,
          driverId: null
        }
      });

      // Update driver if assigned
      if (vehicle.driver) {
        await prisma.driver.update({
          where: { id: vehicle.driver.id },
          data: { 
            assignedVehicle: { disconnect: true }
          }
        });
      }

      return NextResponse.json({ 
        message: 'Vehicle marked as inactive (soft deleted)',
        softDeleted: true 
      });
    }

    // If no related records, hard delete
    // First, unassign any driver
    if (vehicle.driver) {
      await prisma.driver.update({
        where: { id: vehicle.driver.id },
        data: { 
          assignedVehicle: { disconnect: true }
        }
      });
    }

    // Then delete the vehicle
    await prisma.vehicle.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ 
      message: 'Vehicle permanently deleted',
      softDeleted: false 
    });
  } catch (error: any) {
    console.error('Error deleting vehicle:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete vehicle' },
      { status: 500 }
    );
  }
}