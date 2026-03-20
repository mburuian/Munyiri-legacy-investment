// app/api/admin/vehicles/[id]/assign-driver/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/prisma/client';
import { verifyAuth } from '../../../../../../lib/firebase/admin';
import { DriverStatus, VehicleStatus } from '@prisma/client';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const auth = await verifyAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json(
        { error: auth.error }, 
        { status: auth.status }
      );
    }

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
      where: { id: params.id },
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
    if (driver.assignedVehicle && driver.assignedVehicle.id !== params.id) {
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
    // Remove assignedDate if it doesn't exist in your schema
    const [updatedVehicle, updatedDriver] = await prisma.$transaction([
      prisma.vehicle.update({
        where: { id: params.id },
        data: { 
          driverId,
          status: 'ACTIVE' as VehicleStatus
          // Remove assignedDate if it doesn't exist
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
          vehicleId: params.id,
          status: 'ACTIVE' as DriverStatus
        }
      })
    ]);

    // Create notification for driver
    await prisma.notification.create({
      data: {
        userId: driver.userId,
        title: 'Vehicle Assigned',
        message: `You have been assigned to vehicle ${vehicle.regNumber}`,
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
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const auth = await verifyAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json(
        { error: auth.error }, 
        { status: auth.status }
      );
    }

    // Check if vehicle exists and has a driver
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: params.id },
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

    // Remove driver assignment
    // Remove assignedDate if it doesn't exist
    const [updatedVehicle, updatedDriver] = await prisma.$transaction([
      prisma.vehicle.update({
        where: { id: params.id },
        data: { 
          driverId: null
          // Remove assignedDate if it doesn't exist
        }
      }),
      prisma.driver.update({
        where: { id: vehicle.driverId! },
        data: { 
          vehicleId: null,
          status: 'OFF_DUTY' as DriverStatus
        }
      })
    ]);

    // Create notification for driver
    await prisma.notification.create({
      data: {
        userId: updatedDriver.userId,
        title: 'Vehicle Unassigned',
        message: `You have been unassigned from vehicle ${vehicle.regNumber}`,
        type: 'assignment'
      }
    });

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