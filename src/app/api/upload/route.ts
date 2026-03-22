// app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '../../../lib/firebase/admin';
import { prisma } from '../../../lib/prisma';

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

export async function POST(request: NextRequest) {
  try {
    console.log('📸 [UPLOAD] Starting file upload...');
    
    // Verify authentication
    const auth = await verifyAuth(request) as AuthResult;
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: auth.status || 401 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const imageType = formData.get('imageType') as string; // 'main', 'gallery', 'document'
    const entityType = formData.get('entityType') as string; // 'vehicle', 'driver', 'document'
    const entityId = formData.get('entityId') as string; // ID of the entity this image belongs to

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // For vehicle images, entityId is required
    if (entityType === 'vehicle' && !entityId) {
      return NextResponse.json(
        { error: 'Vehicle ID is required for vehicle images' },
        { status: 400 }
      );
    }

    console.log('📁 File details:', {
      name: file.name,
      type: file.type,
      size: file.size,
      imageType,
      entityType,
      entityId,
      userId: auth.user.uid
    });

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      );
    }

    // Convert file to Base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    
    // Create data URL with mime type
    const dataUrl = `data:${file.type};base64,${base64}`;

    console.log('✅ File converted to Base64 successfully');

    // Determine if this should be the primary image
    let isPrimary = false;
    
    if (entityType === 'vehicle') {
      // Check if this is the first image for this vehicle
      const existingImages = await prisma.vehicleImage.count({
        where: { vehicleId: entityId }
      });
      
      // If it's the first image, make it primary
      isPrimary = existingImages === 0;
      
      // If imageType is 'main', explicitly set as primary
      if (imageType === 'main') {
        isPrimary = true;
      }
    }

    // Save to database based on entity type
    let savedImage: any = null;

    if (entityType === 'vehicle') {
      // For vehicle images, save to VehicleImage model
      savedImage = await prisma.vehicleImage.create({
        data: {
          url: dataUrl,
          type: imageType || 'image',
          isPrimary: isPrimary,
          fileName: file.name,
          fileType: file.type,
          vehicleId: entityId,
        }
      });

      // If this image is set as primary, unset other primary images for this vehicle
      if (isPrimary && savedImage) {
        await prisma.vehicleImage.updateMany({
          where: {
            vehicleId: entityId,
            id: { not: savedImage.id }
          },
          data: {
            isPrimary: false
          }
        });
      }

      console.log('💾 Vehicle image saved to database:', savedImage.id);
    } 
    // Add other entity types as needed (driver, document, etc.)
    else if (entityType === 'driver') {
      // For driver images, you might have a DriverImage model
      // For now, store as avatar in User model if it's for driver
      if (imageType === 'avatar') {
        await prisma.user.update({
          where: { id: entityId },
          data: { avatar: dataUrl }
        });
        savedImage = { id: entityId, url: dataUrl, type: 'avatar' };
      } else {
        savedImage = { id: 'pending', url: dataUrl };
      }
    } 
    else if (entityType === 'document') {
      // For document uploads, you might want to store in Document model
      savedImage = { id: 'document', url: dataUrl };
    }
    else {
      // For general uploads without DB storage (temporary)
      savedImage = { id: 'temp', url: dataUrl };
    }

    return NextResponse.json({
      success: true,
      dataUrl: dataUrl,
      fileName: file.name,
      fileType: file.type,
      imageType: imageType,
      entityType: entityType,
      entityId: entityId,
      isPrimary: isPrimary,
      imageId: savedImage?.id,
      message: savedImage && savedImage.id !== 'temp' && savedImage.id !== 'pending' && savedImage.id !== 'document'
        ? 'Image saved to database' 
        : 'Image uploaded (temporary)'
    });

  } catch (error: any) {
    console.error('❌ Upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload file' },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch images for an entity
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request) as AuthResult;
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: auth.status || 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: 'Entity type and ID are required' },
        { status: 400 }
      );
    }

    let images: any[] = [];

    if (entityType === 'vehicle') {
      images = await prisma.vehicleImage.findMany({
        where: { vehicleId: entityId },
        orderBy: [
          { isPrimary: 'desc' },
          { createdAt: 'desc' }
        ]
      });
    } 
    else if (entityType === 'driver') {
      // Get driver avatar from User model
      const driver = await prisma.driver.findUnique({
        where: { id: entityId },
        include: { user: true }
      });
      if (driver?.user?.avatar) {
        images = [{
          id: driver.user.id,
          url: driver.user.avatar,
          type: 'avatar',
          isPrimary: true,
          fileName: 'avatar',
          fileType: 'image'
        }];
      }
    }

    return NextResponse.json({
      success: true,
      images: images
    });

  } catch (error: any) {
    console.error('❌ Error fetching images:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch images' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to remove images
export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifyAuth(request) as AuthResult;
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: auth.status || 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get('imageId');
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');

    if (entityType === 'avatar' && entityId) {
      // Remove avatar from user
      await prisma.user.update({
        where: { id: entityId },
        data: { avatar: null }
      });
      
      return NextResponse.json({
        success: true,
        message: 'Avatar removed successfully'
      });
    }

    if (!imageId) {
      return NextResponse.json(
        { error: 'Image ID is required' },
        { status: 400 }
      );
    }

    const image = await prisma.vehicleImage.findUnique({
      where: { id: imageId }
    });

    if (!image) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }

    // Delete from database
    await prisma.vehicleImage.delete({
      where: { id: imageId }
    });

    // If this was the primary image, set another as primary
    if (image.isPrimary) {
      const nextImage = await prisma.vehicleImage.findFirst({
        where: { vehicleId: image.vehicleId },
        orderBy: { createdAt: 'desc' }
      });

      if (nextImage) {
        await prisma.vehicleImage.update({
          where: { id: nextImage.id },
          data: { isPrimary: true }
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Image deleted successfully'
    });

  } catch (error: any) {
    console.error('❌ Error deleting image:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete image' },
      { status: 500 }
    );
  }
}