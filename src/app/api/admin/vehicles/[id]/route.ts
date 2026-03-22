// app/api/admin/vehicles/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { verifyAuth } from '../../../../../lib/firebase/admin';
import { VehicleStatus } from '@prisma/client';
import { writeFile, mkdir, unlink } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

// Helper function to handle image uploads
async function handleImageUpload(file: File, vehicleId: string, isPrimary: boolean = false) {
  // Validate file type
  const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    throw new Error('Invalid file type. Please upload JPEG, PNG, or WebP images');
  }

  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('File too large. Maximum size is 5MB');
  }

  // Create unique filename
  const timestamp = Date.now();
  const extension = file.name.split('.').pop();
  const filename = `vehicle_${vehicleId}_${timestamp}.${extension}`;
  
  // Ensure upload directory exists
  const uploadDir = path.join(process.cwd(), 'public/uploads/vehicles');
  if (!existsSync(uploadDir)) {
    await mkdir(uploadDir, { recursive: true });
  }

  // Save file
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const filePath = path.join(uploadDir, filename);
  await writeFile(filePath, buffer);
  
  const imageUrl = `/uploads/vehicles/${filename}`;
  
  return {
    url: imageUrl,
    type: 'image',
    isPrimary,
    fileName: file.name,
    fileType: file.type
  };
}

// GET - Fetch vehicle details with images
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: 'Vehicle ID is required' },
        { status: 400 }
      );
    }

    const vehicle = await prisma.vehicle.findUnique({
      where: { id: id },
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
        images: {
          orderBy: { createdAt: 'desc' }
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
        },
        _count: {
          select: {
            trips: true,
            maintenance: true,
            incomeLogs: true,
            expenses: true,
            documents: true,
            alerts: {
              where: { resolved: false }
            }
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

    // Calculate summary statistics
    const totalIncome = vehicle.incomeLogs?.reduce((sum: number, log: { amount: number }) => sum + log.amount, 0) || 0;
    const totalExpenses = vehicle.expenses?.reduce((sum: number, exp: { amount: number }) => sum + exp.amount, 0) || 0;
    const maintenanceCost = vehicle.maintenance?.reduce((sum: number, maint: { cost: number }) => sum + maint.cost, 0) || 0;

    const summary = {
      totalTrips: vehicle._count?.trips || 0,
      totalIncome,
      totalExpenses,
      maintenanceCost,
      netProfit: totalIncome - totalExpenses,
      activeAlerts: vehicle._count?.alerts || 0,
      lastTrip: vehicle.trips && vehicle.trips.length > 0 ? vehicle.trips[0] : null,
      nextMaintenance: vehicle.maintenance && vehicle.maintenance.length > 0 
        ? vehicle.maintenance.find((m: { status: string }) => m.status === 'PENDING' || m.status === 'IN_PROGRESS') 
        : null
    };

    // Remove relations to avoid circular references
    const { trips, maintenance, incomeLogs, expenses, alerts, documents, images, _count, ...vehicleWithoutRelations } = vehicle;

    return NextResponse.json({
      ...vehicleWithoutRelations,
      _count,
      images,
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

// PUT - Update vehicle details
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: 'Vehicle ID is required' },
        { status: 400 }
      );
    }

    const existingVehicle = await prisma.vehicle.findUnique({
      where: { id: id },
      include: { driver: true }
    });

    if (!existingVehicle) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const updateData: any = {};

    // Basic Info
    if (body.plateNumber !== undefined) {
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

    // Handle driver assignment
    if (body.driverId !== undefined) {
      if (body.driverId) {
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

        if (driver.assignedVehicle && driver.assignedVehicle.id !== id) {
          return NextResponse.json(
            { error: 'Driver is already assigned to another vehicle' },
            { status: 400 }
          );
        }

        updateData.driverId = body.driverId;
      } else {
        updateData.driverId = null;
      }
    }

    const vehicle = await prisma.vehicle.update({
      where: { id: id },
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
        },
        images: true
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

// POST - Upload images for vehicle
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: 'Vehicle ID is required' },
        { status: 400 }
      );
    }

    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: { images: true }
    });

    if (!vehicle) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const images = formData.getAll('images') as File[];
    const setPrimary = formData.get('setPrimary') as string;

    if (!images || images.length === 0) {
      return NextResponse.json(
        { error: 'No images provided' },
        { status: 400 }
      );
    }

    const uploadedImages = [];
    
    for (let i = 0; i < images.length; i++) {
      const isPrimary = setPrimary === 'true' && i === 0;
      const imageData = await handleImageUpload(images[i], id, isPrimary);
      
      const createdImage = await prisma.vehicleImage.create({
        data: {
          ...imageData,
          vehicleId: id
        }
      });
      
      uploadedImages.push(createdImage);
    }

    // If this is the first image for this vehicle, set it as primary
    if (vehicle.images.length === 0 && uploadedImages.length > 0) {
      await prisma.vehicleImage.update({
        where: { id: uploadedImages[0].id },
        data: { isPrimary: true }
      });
    }

    return NextResponse.json({
      success: true,
      images: uploadedImages,
      vehicle: await prisma.vehicle.findUnique({
        where: { id },
        include: { images: true, driver: true }
      })
    });
  } catch (error: any) {
    console.error('Error uploading images:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload images' },
      { status: 500 }
    );
  }
}

// DELETE - Delete vehicle or vehicle image
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get('imageId');

    // If imageId is provided, delete an image
    if (imageId) {
      const image = await prisma.vehicleImage.findUnique({
        where: { id: imageId },
        include: { vehicle: true }
      });

      if (!image) {
        return NextResponse.json(
          { error: 'Image not found' },
          { status: 404 }
        );
      }

      if (image.vehicleId !== id) {
        return NextResponse.json(
          { error: 'Image does not belong to this vehicle' },
          { status: 403 }
        );
      }

      // Delete file from filesystem
      const filePath = path.join(process.cwd(), 'public', image.url);
      if (existsSync(filePath)) {
        await unlink(filePath);
      }

      await prisma.vehicleImage.delete({
        where: { id: imageId }
      });

      // If we deleted the primary image, set another as primary if available
      if (image.isPrimary) {
        const remainingImages = await prisma.vehicleImage.findMany({
          where: { vehicleId: id },
          orderBy: { createdAt: 'desc' },
          take: 1
        });
        
        if (remainingImages.length > 0) {
          await prisma.vehicleImage.update({
            where: { id: remainingImages[0].id },
            data: { isPrimary: true }
          });
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Image deleted successfully'
      });
    }

    // Otherwise, delete the entire vehicle
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: id },
      include: {
        driver: true,
        images: true,
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

    // Delete all associated images from filesystem
    for (const image of vehicle.images) {
      const filePath = path.join(process.cwd(), 'public', image.url);
      if (existsSync(filePath)) {
        await unlink(filePath).catch(console.error);
      }
    }

    // If vehicle has related records, soft delete
    if (vehicle._count.trips > 0 || 
        vehicle._count.maintenance > 0 || 
        vehicle._count.incomeLogs > 0 || 
        vehicle._count.expenses > 0) {
      
      await prisma.vehicle.update({
        where: { id: id },
        data: { 
          status: 'INACTIVE' as VehicleStatus,
          driverId: null
        }
      });

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

    // Hard delete if no related records
    if (vehicle.driver) {
      await prisma.driver.update({
        where: { id: vehicle.driver.id },
        data: { 
          assignedVehicle: { disconnect: true }
        }
      });
    }

    await prisma.vehicle.delete({
      where: { id: id }
    });

    return NextResponse.json({ 
      message: 'Vehicle permanently deleted',
      softDeleted: false 
    });
  } catch (error: any) {
    console.error('Error deleting vehicle/image:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete' },
      { status: 500 }
    );
  }
}