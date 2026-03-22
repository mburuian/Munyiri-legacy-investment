// app/api/admin/vehicles/[id]/assign-driver/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/prisma';
import { verifyAuth } from '../../../../../../lib/firebase/admin';
import { DriverStatus, VehicleStatus } from '@prisma/client';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const auth = await verifyAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' }, 
        { status: auth.status || 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { driverId } = body;

    if (!driverId) {
      return NextResponse.json(
        { error: 'Driver ID is required' },
        { status: 400 }
      );
    }

    // Check if vehicle exists
    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: { driver: true }
    });

    if (!vehicle) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    // Check if driver exists and is available
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      include: { assignedVehicle: true }
    });

    if (!driver) {
      return NextResponse.json(
        { error: 'Driver not found' },
        { status: 404 }
      );
    }

    // Check if driver is already assigned to another vehicle
    if (driver.assignedVehicle && driver.assignedVehicle.id !== id) {
      return NextResponse.json(
        { error: 'Driver is already assigned to another vehicle' },
        { status: 400 }
      );
    }

    // Check if vehicle is already assigned to another driver
    if (vehicle.driver && vehicle.driver.id !== driverId) {
      return NextResponse.json(
        { error: 'Vehicle is already assigned to another driver' },
        { status: 400 }
      );
    }

    // Update both vehicle and driver in a transaction
    const [updatedVehicle, updatedDriver] = await prisma.$transaction([
      prisma.vehicle.update({
        where: { id },
        data: { 
          driverId,
          status: 'ACTIVE' as VehicleStatus
        },
        include: {
          driver: {
            include: {
              user: {
                select: { name: true, email: true }
              }
            }
          }
        }
      }),
      prisma.driver.update({
        where: { id: driverId },
        data: { 
          status: 'ACTIVE' as DriverStatus
        }
      })
    ]);

    // Create notification for driver
    await prisma.notification.create({
      data: {
        userId: driver.userId,
        title: 'Vehicle Assigned',
        message: `You have been assigned to vehicle ${vehicle.plateNumber}`,
        type: 'assignment'
      }
    });

    return NextResponse.json({
      vehicle: updatedVehicle,
      driver: updatedDriver,
      message: 'Driver assigned successfully'
    });
  } catch (error: any) {
    console.error('Error assigning driver:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to assign driver' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const auth = await verifyAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' }, 
        { status: auth.status || 401 }
      );
    }

    const { id } = await params;

    // Check if vehicle exists and has a driver
    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: { driver: true }
    });

    if (!vehicle) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    if (!vehicle.driver) {
      return NextResponse.json(
        { error: 'No driver assigned to this vehicle' },
        { status: 400 }
      );
    }

    // Store driver info before unassigning
    const driverId = vehicle.driverId!;
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      include: { user: true }
    });

    // Remove driver assignment
    const [updatedVehicle, updatedDriver] = await prisma.$transaction([
      prisma.vehicle.update({
        where: { id },
        data: { 
          driverId: null
        }
      }),
      prisma.driver.update({
        where: { id: driverId },
        data: { 
          status: 'OFF_DUTY' as DriverStatus
        }
      })
    ]);

    // Create notification for driver
    if (driver && driver.user) {
      await prisma.notification.create({
        data: {
          userId: driver.userId,
          title: 'Vehicle Unassigned',
          message: `You have been unassigned from vehicle ${vehicle.plateNumber}`,
          type: 'assignment'
        }
      });
    }

    return NextResponse.json({
      message: 'Driver unassigned successfully',
      vehicle: updatedVehicle
    });
  } catch (error: any) {
    console.error('Error unassigning driver:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to unassign driver' },
      { status: 500 }
    );
  }
}