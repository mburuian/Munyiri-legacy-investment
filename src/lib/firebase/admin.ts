import admin from 'firebase-admin';

// Flag to track if Firebase Admin is initialized
let isFirebaseAdminInitialized = false;

// Admin emails from environment variables
const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || 'admin@munyirilegacy.com')
  .split(',')
  .map(e => e.trim());

// Try to initialize Firebase Admin SDK
try {
  if (!admin.apps.length) {
    // Check if required environment variables exist
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    console.log('Firebase Admin initialization check:', {
      hasProjectId: !!projectId,
      hasClientEmail: !!clientEmail,
      hasPrivateKey: !!privateKey,
      nodeEnv: process.env.NODE_ENV
    });

    if (projectId && clientEmail && privateKey) {
      // Handle the private key format
      if (privateKey.includes('\\n')) {
        privateKey = privateKey.replace(/\\n/g, '\n');
      }
      
      // Ensure the private key has the correct format
      if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
        privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`;
      }
      
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: projectId,
          clientEmail: clientEmail,
          privateKey: privateKey,
        }),
      });
      
      isFirebaseAdminInitialized = true;
      console.log('✅ Firebase Admin initialized successfully');
    } else {
      console.warn('⚠️ Firebase Admin credentials missing - using mock auth in development');
      // In development, we'll still work with mock auth
      isFirebaseAdminInitialized = true; // Treat as initialized for dev
    }
  } else {
    isFirebaseAdminInitialized = true;
    console.log('✅ Firebase Admin already initialized');
  }
} catch (error) {
  console.error('❌ Firebase Admin initialization error:', error);
  // Don't throw - we'll handle with mock auth in development
}

/**
 * Verify Firebase ID token and return user info
 * NO DATABASE LOOKUP - purely token-based
 */
export async function verifyAuth(request: Request) {
  try {
    console.log('🔑 Verifying authentication token...');
    
    // DEVELOPMENT BYPASS - Always return authenticated for testing
    if (process.env.NODE_ENV === 'development') {
      console.log('🔓 DEVELOPMENT MODE: Bypassing authentication');
      
      // Get the authorization header to extract email if present
      const authHeader = request.headers.get('authorization');
      let email = 'admin@munyirilegacy.com'; // Default admin email
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          // Try to decode the token to get email (but don't verify in dev)
          const token = authHeader.split('Bearer ')[1];
          const base64Url = token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const payload = JSON.parse(Buffer.from(base64, 'base64').toString());
          email = payload.email || email;
        } catch (e) {
          // Ignore decode errors
        }
      }
      
      // Check if the email is in admin list
      const isAdmin = ADMIN_EMAILS.includes(email);
      
      return { 
        authenticated: true, 
        user: {
          uid: 'dev-uid-123',
          email: email,
          name: email.split('@')[0],
          role: isAdmin ? 'ADMIN' : 'DRIVER',
          phone: null,
          avatar: null
        },
        status: 200 
      };
    }

    // PRODUCTION - Real token verification
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No token provided');
      return { 
        authenticated: false, 
        error: 'No token provided',
        status: 401 
      };
    }

    const token = authHeader.split('Bearer ')[1];
    
    if (!token) {
      console.log('❌ Invalid token format');
      return { 
        authenticated: false, 
        error: 'Invalid token',
        status: 401 
      };
    }

    if (!isFirebaseAdminInitialized) {
      console.error('❌ Firebase Admin not initialized');
      return { 
        authenticated: false, 
        error: 'Authentication service unavailable',
        status: 503 
      };
    }

    // Verify the Firebase token
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
      console.log('✅ Token verified for email:', decodedToken.email);
    } catch (verifyError) {
      console.error('❌ Token verification failed:', verifyError);
      return { 
        authenticated: false, 
        error: 'Invalid or expired token',
        status: 401 
      };
    }

    // Determine role based on email (from env)
    const email = decodedToken.email || '';
    const isAdmin = ADMIN_EMAILS.includes(email);
    
    // Return user info from token only - NO DATABASE LOOKUP
    return { 
      authenticated: true, 
      user: {
        uid: decodedToken.uid,
        email: email,
        name: decodedToken.name || email.split('@')[0],
        role: isAdmin ? 'ADMIN' : 'DRIVER',
        phone: decodedToken.phone_number || null,
        avatar: decodedToken.picture || null
      },
      status: 200 
    };
    
  } catch (error) {
    console.error('❌ Auth verification error:', error);
    return { 
      authenticated: false, 
      error: 'Authentication failed',
      status: 401 
    };
  }
}

/**
 * Verify driver authentication - NO DATABASE LOOKUP
 */
export async function verifyDriverAuth(request: Request) {
  try {
    console.log('🔑 Verifying driver authentication...');
    
    // DEVELOPMENT BYPASS
    if (process.env.NODE_ENV === 'development') {
      console.log('🔓 DEVELOPMENT MODE: Bypassing driver authentication');
      
      // Get email from token if possible
      const authHeader = request.headers.get('authorization');
      let email = 'driver@example.com';
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.split('Bearer ')[1];
          const base64Url = token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const payload = JSON.parse(Buffer.from(base64, 'base64').toString());
          email = payload.email || email;
        } catch (e) {
          // Ignore decode errors
        }
      }
      
      const isAdmin = ADMIN_EMAILS.includes(email);
      
      return { 
        authenticated: true, 
        user: {
          uid: 'dev-driver-uid',
          email: email,
          name: email.split('@')[0],
          role: isAdmin ? 'ADMIN' : 'DRIVER',
          phone: '+254711111111',
          avatar: null,
          driver: { 
            id: 'dev-driver-profile-id',
            licenseNumber: 'DEV123456',
            status: 'ACTIVE',
            createdAt: new Date(),
            assignedVehicle: null,
            rating: 4.5,
            tripsCompleted: 0,
            totalRevenue: 0
          }
        },
        status: 200 
      };
    }

    // PRODUCTION - Real token verification
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No token provided');
      return { 
        authenticated: false, 
        error: 'No token provided',
        status: 401 
      };
    }

    const token = authHeader.split('Bearer ')[1];
    
    if (!token) {
      console.log('❌ Invalid token format');
      return { 
        authenticated: false, 
        error: 'Invalid token',
        status: 401 
      };
    }

    if (!isFirebaseAdminInitialized) {
      console.error('❌ Firebase Admin not initialized');
      return { 
        authenticated: false, 
        error: 'Authentication service unavailable',
        status: 503 
      };
    }

    // Verify the Firebase token
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
      console.log('✅ Token verified for email:', decodedToken.email);
    } catch (verifyError) {
      console.error('❌ Token verification failed:', verifyError);
      return { 
        authenticated: false, 
        error: 'Invalid or expired token',
        status: 401 
      };
    }

    // Determine role based on email
    const email = decodedToken.email || '';
    const isAdmin = ADMIN_EMAILS.includes(email);
    
    // Return user info from token - NO DATABASE LOOKUP
    // For drivers, we'll create a mock driver object
    // In a real app, you might want to store driver profiles in the database
    return { 
      authenticated: true, 
      user: {
        uid: decodedToken.uid,
        email: email,
        name: decodedToken.name || email.split('@')[0],
        role: isAdmin ? 'ADMIN' : 'DRIVER',
        phone: decodedToken.phone_number || null,
        avatar: decodedToken.picture || null,
        // Mock driver data - in production, this would come from your database
        driver: { 
          id: `driver-${decodedToken.uid}`,
          licenseNumber: 'TEMP-' + Math.random().toString(36).substring(7).toUpperCase(),
          status: 'ACTIVE',
          createdAt: new Date(),
          assignedVehicle: null,
          rating: null,
          tripsCompleted: 0,
          totalRevenue: 0
        }
      },
      status: 200 
    };
    
  } catch (error) {
    console.error('❌ Driver auth verification error:', error);
    return { 
      authenticated: false, 
      error: 'Authentication failed',
      status: 401 
    };
  }
}

/**
 * Check if user has required role
 */
export function hasRole(user: any, allowedRoles: string[]) {
  return user && allowedRoles.includes(user.role);
}

/**
 * Create a custom session token (optional)
 */
export async function createSessionToken(uid: string) {
  try {
    if (!isFirebaseAdminInitialized) {
      throw new Error('Firebase Admin not initialized');
    }
    
    const customToken = await admin.auth().createCustomToken(uid);
    return { success: true, token: customToken };
  } catch (error) {
    console.error('Error creating session token:', error);
    return { success: false, error: 'Failed to create session token' };
  }
}