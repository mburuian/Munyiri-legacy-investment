// app/api/auth/verify-otp/route.ts
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
    
    // Verify the token
    const decodedToken = await admin.auth().verifyIdToken(token);
    const uid = decodedToken.uid;

    // Get current user to check OTP expiry
    const user = await admin.auth().getUser(uid);
    const claims = user.customClaims || {};

    // Check if OTP is expired
    if (Date.now() > claims.otpExpiry) {
      return NextResponse.json(
        { error: 'OTP has expired' },
        { status: 400 }
      );
    }

    // Update custom claims - remove OTP data and allow password change
    await admin.auth().setCustomUserClaims(uid, {
      ...claims,
      otp: null,
      otpExpiry: null,
      mustChangePassword: true, // Still true until they change password
      otpVerified: true // Mark that OTP was verified
    });

    return NextResponse.json({ 
      success: true,
      message: 'OTP verified successfully'
    });

  } catch (error: any) {
    console.error('OTP verification error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to verify OTP' },
      { status: 500 }
    );
  }
}