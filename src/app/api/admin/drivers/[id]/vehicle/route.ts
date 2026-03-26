// src/app/api/admin/drivers/[id]/vehicle/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '../../../../../../lib/firebase/admin';
import { prisma } from '../../../../../../lib/prisma';

// Define the return type for auth
interface AuthResult {
  authenticated: boolean;
  user?: {
    uid: string;
    email: string;
    name: any;
    role: string;
    phone: string | null;
    avatar: string | null;
  };
  error?: string;
  status?: number;
}

// PUT - Assign or unassign a vehicle to a driver
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log(`📝 [DRIVER VEHICLE] Processing vehicle assignment for driver: ${id}`);
    
    // Verify authentication
    const auth = await verifyAuth(request) as AuthResult;
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: auth.status || 401 }
      );
    }

    // Check if user is admin
    const userRole = auth.user.role;
    if (userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get request body
    const body = await request.json();
    const { vehicleId } = body;

    console.log(`Vehicle ID to assign: ${vehicleId === null ? 'null (unassign)' : vehicleId}`);

    // Check if driver exists
    const driver = await prisma.driver.findUnique({
      where: { id },
      include: {
        user: true,
        assignedVehicle: true
      }
    });

    if (!driver) {
      return NextResponse.json(
        { error: 'Driver not found' },
        { status: 404 }
      );
    }

    // If vehicleId is null, unassign the current vehicle
    if (vehicleId === null) {
      // Check if driver has a vehicle assigned
      if (!driver.assignedVehicle) {
        return NextResponse.json(
          { error: 'Driver does not have a vehicle assigned' },
          { status: 400 }
        );
      }

      const currentVehicleId = driver.assignedVehicle.id;
      
      // Unassign the vehicle from driver
      const updatedDriver = await prisma.driver.update({
        where: { id },
        data: {
          assignedVehicle: {
            disconnect: true
          }
        },
        include: {
          user: true,
          assignedVehicle: true
        }
      });

      // Also update the vehicle to remove driver assignment
      await prisma.vehicle.update({
        where: { id: currentVehicleId },
        data: {
          driver: {
            disconnect: true
          }
        }
      });

      console.log(`✅ Vehicle unassigned from driver: ${driver.user.name}`);
      
      return NextResponse.json({
        success: true,
        message: 'Vehicle unassigned successfully',
        driver: updatedDriver
      });
    }

    // Assign a vehicle
    // Check if vehicle exists
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: {
        driver: true
      }
    });

    if (!vehicle) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    // Check if vehicle is already assigned to another driver
    if (vehicle.driverId && vehicle.driverId !== id) {
      const assignedDriver = await prisma.driver.findUnique({
        where: { id: vehicle.driverId },
        include: { user: true }
      });
      return NextResponse.json(
        { 
          error: 'Vehicle is already assigned to another driver',
          assignedTo: assignedDriver?.user?.name || 'another driver'
        },
        { status: 400 }
      );
    }

    // If vehicle is already assigned to this driver, no change needed
    if (vehicle.driverId === id) {
      return NextResponse.json({
        success: true,
        message: 'Vehicle already assigned to this driver',
        driver,
        vehicle: vehicle
      });
    }

    // First, disconnect any existing vehicle from this driver (if any)
    if (driver.assignedVehicle) {
      await prisma.driver.update({
        where: { id },
        data: {
          assignedVehicle: {
            disconnect: true
          }
        }
      });
      
      await prisma.vehicle.update({
        where: { id: driver.assignedVehicle.id },
        data: {
          driver: {
            disconnect: true
          }
        }
      });
    }

    // Assign new vehicle to driver
    const updatedDriver = await prisma.driver.update({
      where: { id },
      data: {
        assignedVehicle: {
          connect: { id: vehicleId }
        }
      },
      include: {
        user: true,
        assignedVehicle: true
      }
    });

    // Update vehicle to mark as assigned
    await prisma.vehicle.update({
      where: { id: vehicleId },
      data: {
        driver: {
          connect: { id: id }
        }
      }
    });

    console.log(`✅ Vehicle ${vehicle.plateNumber} assigned to driver: ${driver.user.name}`);

    return NextResponse.json({
      success: true,
      message: 'Vehicle assigned successfully',
      driver: updatedDriver,
      vehicle: updatedDriver.assignedVehicle
    });

  } catch (error: any) {
    console.error('❌ Error assigning vehicle to driver:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to assign vehicle' },
      { status: 500 }
    );
  }
}

// GET - Get current assigned vehicle for a driver
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Verify authentication
    const auth = await verifyAuth(request) as AuthResult;
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: auth.status || 401 }
      );
    }

    // Find driver with assigned vehicle
    const driver = await prisma.driver.findUnique({
      where: { id },
      include: {
        user: true,
        assignedVehicle: {
          include: {
            images: {
              where: { isPrimary: true },
              take: 1
            }
          }
        }
      }
    });

    if (!driver) {
      return NextResponse.json(
        { error: 'Driver not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      driver: {
        id: driver.id,
        name: driver.user.name,
        email: driver.user.email
      },
      vehicle: driver.assignedVehicle || null
    });

  } catch (error: any) {
    console.error('❌ Error fetching driver vehicle:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch vehicle' },
      { status: 500 }
    );
  }
}