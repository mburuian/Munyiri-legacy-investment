// app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '../../../lib/firebase/admin';
import { prisma } from '../../../lib/prisma';
import { randomUUID } from 'crypto';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Constants
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];

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

// Helper function to validate image
function validateImage(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { 
      valid: false, 
      error: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.' 
    };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { 
      valid: false, 
      error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.` 
    };
  }
  return { valid: true };
}

// Helper function to upload to Cloudinary
async function uploadToCloudinary(file: File, folder: string): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `mli-fleet/${folder}`,
        resource_type: 'image',
        transformation: [
          { quality: 'auto:good' },
          { fetch_format: 'auto' },
          { width: 1200, crop: 'limit' }
        ]
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result!.secure_url);
      }
    );
    uploadStream.end(buffer);
  });
}

// Helper function to process vehicle image
async function processVehicleImage(
  file: File,
  entityId: string,
  imageType: string,
  isPrimary?: boolean
) {
  // Upload to Cloudinary
  const imageUrl = await uploadToCloudinary(file, `vehicles/${entityId}`);
  
  // Check if this should be the primary image
  let shouldBePrimary = isPrimary || false;
  
  if (!shouldBePrimary) {
    const existingImages = await prisma.vehicleImage.count({
      where: { vehicleId: entityId }
    });
    shouldBePrimary = existingImages === 0;
  }
  
  const savedImage = await prisma.vehicleImage.create({
    data: {
      url: imageUrl,
      type: imageType || 'image',
      isPrimary: shouldBePrimary,
      fileName: file.name,
      fileType: file.type,
      vehicleId: entityId,
    }
  });
  
  // If this image is set as primary, unset other primary images
  if (shouldBePrimary && savedImage) {
    await prisma.vehicleImage.updateMany({
      where: {
        vehicleId: entityId,
        id: { not: savedImage.id }
      },
      data: { isPrimary: false }
    });
  }
  
  return savedImage;
}

// Helper function to process driver image
async function processDriverImage(
  file: File,
  entityId: string,
  imageType: string
) {
  // Upload to Cloudinary
  const imageUrl = await uploadToCloudinary(file, `drivers/${entityId}`);
  
  // Find the driver and update user avatar
  const driver = await prisma.driver.findUnique({
    where: { id: entityId },
    include: { user: true }
  });
  
  if (!driver) {
    throw new Error('Driver not found');
  }
  
  // Update user avatar with Cloudinary URL
  const updatedUser = await prisma.user.update({
    where: { id: driver.userId },
    data: { avatar: imageUrl }
  });
  
  return {
    id: driver.userId,
    url: imageUrl,
    type: imageType || 'avatar',
    isPrimary: true,
    fileName: file.name,
    fileType: file.type,
    driverId: entityId,
    driverName: driver.user.name
  };
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
    
    // Check permissions
    const isAdmin = auth.user.role === 'ADMIN';
    const isFleetManager = auth.user.role === 'FLEET_MANAGER';
    
    if (!isAdmin && !isFleetManager) {
      return NextResponse.json(
        { error: 'Insufficient permissions.' },
        { status: 403 }
      );
    }
    
    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const imageType = formData.get('imageType') as string || 'image';
    const entityType = formData.get('entityType') as string;
    const entityId = formData.get('entityId') as string;
    const setPrimary = formData.get('setPrimary') === 'true';
    
    // Validate required fields
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: 'Entity type and ID are required' },
        { status: 400 }
      );
    }
    
    // Validate file
    const validation = validateImage(file);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }
    
    console.log('📁 File details:', {
      name: file.name,
      type: file.type,
      size: `${(file.size / 1024).toFixed(2)}KB`,
      entityType,
      entityId
    });
    
    let savedImage: any = null;
    
    // Process based on entity type
    switch (entityType) {
      case 'vehicle':
        savedImage = await processVehicleImage(file, entityId, imageType, setPrimary);
        break;
        
      case 'driver':
        savedImage = await processDriverImage(file, entityId, imageType);
        break;
        
      default:
        return NextResponse.json(
          { error: `Unsupported entity type: ${entityType}` },
          { status: 400 }
        );
    }
    
    return NextResponse.json({
      success: true,
      image: savedImage,
      message: `${entityType} image uploaded successfully`
    });
    
  } catch (error: any) {
    console.error('❌ Upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload file' },
      { status: 500 }
    );
  }
}

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
    
    switch (entityType) {
      case 'vehicle':
        images = await prisma.vehicleImage.findMany({
          where: { vehicleId: entityId },
          orderBy: [
            { isPrimary: 'desc' },
            { createdAt: 'desc' }
          ]
        });
        break;
        
      case 'driver':
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
            fileType: 'image',
            createdAt: driver.user.updatedAt
          }];
        }
        break;
    }
    
    return NextResponse.json({
      success: true,
      images: images,
      count: images.length
    });
    
  } catch (error: any) {
    console.error('❌ Error fetching images:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch images' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifyAuth(request) as AuthResult;
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: auth.status || 401 }
      );
    }
    
    // Check permissions
    const isAdmin = auth.user.role === 'ADMIN';
    const isFleetManager = auth.user.role === 'FLEET_MANAGER';
    
    if (!isAdmin && !isFleetManager) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get('imageId');
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');
    
    // Handle avatar deletion
    if (entityType === 'driver' && entityId && searchParams.get('type') === 'avatar') {
      const driver = await prisma.driver.findUnique({
        where: { id: entityId },
        include: { user: true }
      });
      
      if (!driver) {
        return NextResponse.json(
          { error: 'Driver not found' },
          { status: 404 }
        );
      }
      
      await prisma.user.update({
        where: { id: driver.userId },
        data: { avatar: null }
      });
      
      return NextResponse.json({
        success: true,
        message: 'Driver avatar removed successfully'
      });
    }
    
    if (!imageId) {
      return NextResponse.json(
        { error: 'Image ID is required' },
        { status: 400 }
      );
    }
    
    // Find the image
    const image = await prisma.vehicleImage.findUnique({
      where: { id: imageId }
    });
    
    if (!image) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }
    
    // Extract public ID from Cloudinary URL
    const urlParts = image.url.split('/');
    const filename = urlParts[urlParts.length - 1];
    const publicId = `mli-fleet/vehicles/${image.vehicleId}/${filename.split('.')[0]}`;
    
    // Delete from Cloudinary
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (cloudinaryError) {
      console.error('Cloudinary delete error:', cloudinaryError);
      // Continue with database deletion even if Cloudinary fails
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