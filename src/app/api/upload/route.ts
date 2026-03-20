// app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '../../../lib/firebase/admin';

export async function POST(request: NextRequest) {
  try {
    console.log('📸 [UPLOAD] Starting file upload...');
    
    // Verify authentication
    const auth = await verifyAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const imageType = formData.get('imageType') as string; // 'main', 'gallery', 'document'

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    console.log('📁 File details:', {
      name: file.name,
      type: file.type,
      size: file.size,
      imageType
    });

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG and PNG images are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (5MB max for database storage)
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

    return NextResponse.json({
      success: true,
      dataUrl: dataUrl,
      fileName: file.name,
      fileType: file.type,
      imageType: imageType
    });

  } catch (error: any) {
    console.error('❌ Upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload file' },
      { status: 500 }
    );
  }
}