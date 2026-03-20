// src/lib/auth/get-user.ts
import { NextRequest } from 'next/server';
import { prisma } from '../../../lib/prisma';

export interface RequestUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  phone: string | null;
  avatar: string | null;
}

export async function getUserFromRequest(request: NextRequest): Promise<RequestUser | null> {
  try {
    // Get user info from headers (set by middleware)
    const userId = request.headers.get('x-user-id');
    const userEmail = request.headers.get('x-user-email');
    const userRole = request.headers.get('x-user-role');
    const userName = request.headers.get('x-user-name');

    if (!userId || !userEmail) {
      return null;
    }

    // For development with mock users
    if (userId === 'dev-user-id') {
      return {
        id: userId,
        email: userEmail,
        name: userName || 'Development User',
        role: userRole || 'ADMIN',
        phone: null,
        avatar: null,
      };
    }

    // Optional: Get fresh data from database if needed
    // This is useful if you need the latest user data
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        avatar: true,
      }
    });

    if (dbUser) {
      return dbUser;
    }

    // Fallback to header data
    return {
      id: userId,
      email: userEmail,
      name: userName,
      role: userRole || 'DRIVER',
      phone: null,
      avatar: null,
    };

  } catch (error) {
    console.error('❌ Error getting user from request:', error);
    return null;
  }
}

// Specialized helper for driver routes
export async function getDriverFromRequest(request: NextRequest) {
  const user = await getUserFromRequest(request);
  
  if (!user) {
    return null;
  }

  // If it's a driver, get their driver profile
  if (user.role === 'DRIVER') {
    const driver = await prisma.driver.findUnique({
      where: { userId: user.id },
      include: {
        assignedVehicle: true,
        performanceMetrics: {
          take: 1,
          orderBy: { date: 'desc' }
        }
      }
    });

    if (driver) {
      return {
        ...user,
        driver,
      };
    }
  }

  return user;
}