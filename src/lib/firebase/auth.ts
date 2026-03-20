import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  UserCredential,
  User,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { auth } from './config';

export interface UserData {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'manager' | 'driver';
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'inactive' | 'pending';
  photoURL?: string;
}

// Simple in-memory store for user roles (bypass Firestore)
const userRoles: Record<string, UserData> = {};

// Get admin email from env
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@munyirilegacy.com';

// Google Sign In - Simplified (bypass Firestore)
export const signInWithGoogle = async (): Promise<UserCredential> => {
  try {
    console.log('Starting Google sign-in...');
    
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    
    const userCredential = await signInWithPopup(auth, provider);
    const user = userCredential.user;
    
    console.log('Google sign-in successful for user:', user.email);

    // Determine role based on email
    const role = user.email === ADMIN_EMAIL ? 'admin' : 'driver';
    
    // Store in memory (bypass Firestore)
    userRoles[user.uid] = {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || user.email?.split('@')[0] || 'User',
      role: role,
      phone: user.phoneNumber || '',
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'active', // Always active for now
      photoURL: user.photoURL || ''
    };

    return userCredential;
  } catch (error: any) {
    console.error('Google sign-in error:', error);
    
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('Sign-in cancelled. Please try again.');
    }
    throw new Error(error.message || 'Failed to sign in with Google');
  }
};

// Sign up new user - Simplified
export const signUp = async (
  email: string,
  password: string,
  displayName: string,
  phone?: string
): Promise<UserCredential> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Update profile with display name
    await updateProfile(userCredential.user, {
      displayName: displayName
    });

    // Determine role based on email
    const role = email === ADMIN_EMAIL ? 'admin' : 'driver';

    // Store in memory (bypass Firestore)
    userRoles[userCredential.user.uid] = {
      uid: userCredential.user.uid,
      email,
      displayName,
      role: role,
      phone,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'active' // Always active for now
    };

    return userCredential;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Sign in user - Simplified (bypass Firestore checks)
export const signIn = async (email: string, password: string): Promise<UserCredential> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log('Sign in successful for:', email);
    
    return userCredential;
  } catch (error: any) {
    console.error('Sign in error:', error);
    
    if (error.code === 'auth/user-not-found') {
      throw new Error('No account found with this email address.');
    } else if (error.code === 'auth/wrong-password') {
      throw new Error('Incorrect password. Please try again.');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Invalid email address format.');
    } else if (error.code === 'auth/too-many-requests') {
      throw new Error('Too many failed login attempts. Please try again later.');
    }
    
    throw new Error(error.message || 'Failed to sign in');
  }
};

// Sign out user
export const logOut = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Reset password
export const resetPassword = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Get user role (from memory)
export const getUserRole = async (uid: string): Promise<string | null> => {
  try {
    // Check memory first
    if (userRoles[uid]) {
      return userRoles[uid].role;
    }
    
    // If not in memory, determine by current user
    const user = auth.currentUser;
    if (user && user.uid === uid) {
      const role = user.email === ADMIN_EMAIL ? 'admin' : 'driver';
      return role;
    }
    
    return 'driver'; // Default to driver
  } catch (error) {
    console.error('Error getting user role:', error);
    return 'driver'; // Default to driver on error
  }
};

// Check if user is admin
export const isAdmin = async (uid: string): Promise<boolean> => {
  const role = await getUserRole(uid);
  return role === 'admin';
};