// lib/firebase/auth.ts
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
      status: 'active', // Always active for now
      photoURL: userCredential.user.photoURL || ''
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
    
    // Store user in memory after sign in
    const user = userCredential.user;
    const role = email === ADMIN_EMAIL ? 'admin' : 'driver';
    
    if (!userRoles[user.uid]) {
      userRoles[user.uid] = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || user.email?.split('@')[0] || 'User',
        role: role,
        phone: user.phoneNumber || '',
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'active',
        photoURL: user.photoURL || ''
      };
    }
    
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
    // Clear user roles for logged out user
    const user = auth.currentUser;
    if (user) {
      delete userRoles[user.uid];
    }
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

// Get current user data - NEW FUNCTION
export const getCurrentUserData = async (): Promise<UserData | null> => {
  try {
    const user = auth.currentUser;
    if (!user) return null;

    // Check if user data exists in memory
    let userData = userRoles[user.uid];
    
    if (!userData) {
      // If not in memory, create basic user data
      const role = user.email === ADMIN_EMAIL ? 'admin' : 'driver';
      userData = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || user.email?.split('@')[0] || 'User',
        role: role,
        phone: user.phoneNumber || '',
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'active',
        photoURL: user.photoURL || ''
      };
      
      // Store in memory
      userRoles[user.uid] = userData;
    }
    
    return userData;
  } catch (error: any) {
    console.error('Error getting current user data:', error);
    return null;
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

// Get user data by UID
export const getUserData = async (uid: string): Promise<UserData | null> => {
  try {
    // Check memory first
    if (userRoles[uid]) {
      return userRoles[uid];
    }
    
    // If not in memory and it's the current user, create it
    const currentUser = auth.currentUser;
    if (currentUser && currentUser.uid === uid) {
      const role = currentUser.email === ADMIN_EMAIL ? 'admin' : 'driver';
      const userData: UserData = {
        uid: currentUser.uid,
        email: currentUser.email || '',
        displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
        role: role,
        phone: currentUser.phoneNumber || '',
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'active',
        photoURL: currentUser.photoURL || ''
      };
      userRoles[uid] = userData;
      return userData;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
};