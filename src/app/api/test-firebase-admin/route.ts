import { NextResponse } from 'next/server';
import admin from 'firebase-admin';

export async function GET() {
  try {
    // Check if Firebase Admin is already initialized
    const isInitialized = admin.apps.length > 0;
    
    // Check environment variables
    const envVars = {
      projectId: !!process.env.FIREBASE_PROJECT_ID,
      clientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: !!process.env.FIREBASE_PRIVATE_KEY,
      privateKeyLength: process.env.FIREBASE_PRIVATE_KEY?.length || 0,
      nodeEnv: process.env.NODE_ENV,
    };

    // Try to get a test app
    let appName = null;
    if (isInitialized) {
      appName = admin.app().name;
    }

    return NextResponse.json({
      success: true,
      isInitialized,
      appName,
      envVars,
      message: 'Firebase Admin check completed'
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}