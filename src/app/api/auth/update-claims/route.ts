// app/api/auth/update-claims/route.ts
import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];
    const { mustChangePassword } = await request.json();
    
    // Verify the token
    const decodedToken = await admin.auth().verifyIdToken(token);
    const uid = decodedToken.uid;

    // Get current user to preserve existing claims
    const user = await admin.auth().getUser(uid);
    const existingClaims = user.customClaims || {};

    // Update custom claims
    await admin.auth().setCustomUserClaims(uid, {
      ...existingClaims,
      mustChangePassword,
      // Clear OTP-related data after password change
      otp: null,
      otpExpiry: null,
      otpVerified: null,
      isFirstLogin: false
    });

    return NextResponse.json({ 
      success: true,
      message: 'Claims updated successfully'
    });

  } catch (error: any) {
    console.error('Error updating claims:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update claims' },
      { status: 500 }
    );
  }
}