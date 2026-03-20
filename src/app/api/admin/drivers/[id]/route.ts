// app/api/admin/drivers/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { verifyAuth } from '../../../../../lib/firebase/admin';

// Helper function to check if email is in admin list from env
function isAdminEmail(email: string): boolean {
  const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || [];
  return adminEmails.includes(email.toLowerCase());
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params
    const { id: driverId } = await params;
    
    console.log('🔍 Admin Driver API Called');
    console.log('Driver ID:', driverId);
    
    // Verify authentication with Firebase
    const auth = await verifyAuth(request);
    
    console.log('Auth result:', {
      authenticated: auth.authenticated,
      hasUser: !!auth.user,
      userUid: auth.user?.uid,
      userEmail: auth.user?.email,
      status: auth.status
    });

    if (!auth.authenticated || !auth.user) {
      console.log('❌ Authentication failed');
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: auth.status || 401 }
      );
    }

    const userEmail = auth.user.email;
    
    // ✅ Check if email is in admin list from environment variables
    const isEnvAdmin = isAdminEmail(userEmail);
    
    console.log('Admin check:', {
      email: userEmail,
      isEnvAdmin,
      adminEmails: process.env.ADMIN_EMAILS?.split(',') || [],
      nodeEnv: process.env.NODE_ENV
    });

    // If not in admin list, check database for admin record
    let isDbAdmin = false;
    let adminRecord = null;
    
    if (!isEnvAdmin) {
      adminRecord = await prisma.user.findUnique({
        where: { email: userEmail },
        include: { admin: true }
      });
      isDbAdmin = adminRecord?.admin !== null;
    }

    // Grant access if either env admin OR database admin
    const isAdmin = isEnvAdmin || isDbAdmin;

    if (!isAdmin) {
      console.log('❌ User is not an admin');
      return NextResponse.json(
        { 
          error: 'Admin access required',
          message: 'This endpoint is restricted to administrators only.'
        },
        { status: 403 }
      );
    }

    console.log('✅ Admin access granted', isEnvAdmin ? '(from env)' : '(from database)');

    // Fetch the driver
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
            avatar: true,
            createdAt: true,
            role: true,
          },
        },
        assignedVehicle: {
          include: {
            trips: {
              orderBy: { startTime: 'desc' },
              take: 50,
            },
            documents: true,
            maintenance: {
              orderBy: { date: 'desc' },
              take: 20,
            },
            expenses: {
              orderBy: { date: 'desc' },
              take: 20,
            },
          },
        },
        incomeLogs: {
          orderBy: { date: 'desc' },
          take: 100,
        },
        expenses: {
          orderBy: { date: 'desc' },
          take: 100,
        },
        trips: {
          orderBy: { startTime: 'desc' },
          take: 100,
          include: {
            vehicle: true,
          },
        },
        alerts: {
          orderBy: { createdAt: 'desc' },
        },
        performanceMetrics: {
          orderBy: { date: 'desc' },
          take: 30,
        },
      },
    });

    if (!driver) {
      console.log('❌ Driver not found:', driverId);
      return NextResponse.json(
        { error: 'Driver not found' },
        { status: 404 }
      );
    }

    console.log('✅ Driver found:', driver.id);

    // Calculate statistics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    const stats = {
      today: {
        income: driver.incomeLogs
          .filter(log => new Date(log.date) >= today)
          .reduce((sum, log) => sum + log.amount, 0),
        trips: driver.trips
          .filter(trip => new Date(trip.startTime) >= today && trip.status === 'COMPLETED')
          .length,
        expenses: driver.expenses
          .filter(exp => new Date(exp.date) >= today && exp.approved)
          .reduce((sum, exp) => sum + exp.amount, 0),
      },
      week: {
        income: driver.incomeLogs
          .filter(log => new Date(log.date) >= weekAgo)
          .reduce((sum, log) => sum + log.amount, 0),
        trips: driver.trips
          .filter(trip => new Date(trip.startTime) >= weekAgo && trip.status === 'COMPLETED')
          .length,
        expenses: driver.expenses
          .filter(exp => new Date(exp.date) >= weekAgo && exp.approved)
          .reduce((sum, exp) => sum + exp.amount, 0),
      },
      month: {
        income: driver.incomeLogs
          .filter(log => new Date(log.date) >= monthAgo)
          .reduce((sum, log) => sum + log.amount, 0),
        trips: driver.trips
          .filter(trip => new Date(trip.startTime) >= monthAgo && trip.status === 'COMPLETED')
          .length,
        expenses: driver.expenses
          .filter(exp => new Date(exp.date) >= monthAgo && exp.approved)
          .reduce((sum, exp) => sum + exp.amount, 0),
      },
      allTime: {
        income: driver.incomeLogs.reduce((sum, log) => sum + log.amount, 0),
        trips: driver.trips.filter(trip => trip.status === 'COMPLETED').length,
        expenses: driver.expenses.filter(exp => exp.approved).reduce((sum, exp) => sum + exp.amount, 0),
        distance: driver.trips.reduce((sum, trip) => sum + (trip.distanceKm || 0), 0),
      },
    };

    // Calculate monthly performance
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      date.setDate(1);
      date.setHours(0, 0, 0, 0);
      return date;
    }).reverse();

    const monthlyPerformance = last6Months.map(monthStart => {
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      
      const monthlyIncome = driver.incomeLogs
        .filter(log => {
          const logDate = new Date(log.date);
          return logDate >= monthStart && logDate < monthEnd;
        })
        .reduce((sum, log) => sum + log.amount, 0);
        
      const monthlyTrips = driver.trips
        .filter(trip => {
          const tripDate = new Date(trip.startTime);
          return tripDate >= monthStart && tripDate < monthEnd && trip.status === 'COMPLETED';
        })
        .length;
        
      return {
        month: monthStart.toLocaleString('default', { month: 'short' }),
        income: monthlyIncome,
        trips: monthlyTrips,
      };
    });

    return NextResponse.json({
      success: true,
      driver: {
        id: driver.id,
        name: driver.user?.name || 'Unknown',
        email: driver.user?.email || '',
        phone: driver.user?.phone || '',
        avatar: driver.user?.avatar || null,
        licenseNumber: driver.licenseNumber,
        status: driver.status.toLowerCase(),
        joinedDate: driver.user?.createdAt || driver.createdAt,
        lastActive: driver.trips[0]?.startTime || driver.createdAt,
      },
      vehicle: driver.assignedVehicle ? {
        id: driver.assignedVehicle.id,
        plateNumber: driver.assignedVehicle.plateNumber,
        model: driver.assignedVehicle.model,
        capacity: driver.assignedVehicle.capacity,
        status: driver.assignedVehicle.status.toLowerCase(),
        totalTrips: driver.assignedVehicle.trips.length,
        totalDistance: driver.assignedVehicle.trips.reduce((sum, t) => sum + (t.distanceKm || 0), 0),
        totalEarnings: driver.assignedVehicle.trips.reduce((sum, t) => sum + (t.fare || 0), 0),
        lastMaintenance: driver.assignedVehicle.maintenance[0] || null,
        documents: driver.assignedVehicle.documents.map(doc => ({
          type: doc.type,
          expiryDate: doc.expiryDate,
          status: doc.expiryDate && doc.expiryDate < new Date() ? 'expired' : 'valid',
        })),
      } : null,
      stats,
      monthlyPerformance,
      recentActivity: {
        trips: driver.trips.slice(0, 10).map(trip => ({
          id: trip.id,
          date: trip.startTime,
          from: trip.startLocation || 'Unknown',
          to: trip.endLocation || 'Unknown',
          distance: trip.distanceKm || 0,
          fare: trip.fare || 0,
          status: trip.status,
        })),
        income: driver.incomeLogs.slice(0, 10).map(log => ({
          id: log.id,
          date: log.date,
          amount: log.amount,
          type: log.type,
          description: log.description || '',
        })),
        expenses: driver.expenses.slice(0, 10).map(exp => ({
          id: exp.id,
          date: exp.date,
          amount: exp.amount,
          category: exp.category,
          description: exp.description,
          approved: exp.approved,
        })),
      },
      alerts: driver.alerts.map(alert => ({
        id: alert.id,
        title: alert.title,
        description: alert.description,
        severity: alert.severity,
        dueDate: alert.dueDate,
        resolved: alert.resolved,
        createdAt: alert.createdAt,
      })),
      performance: driver.performanceMetrics.map(metric => ({
        date: metric.date,
        tripsCount: metric.tripsCount,
        totalIncome: metric.totalIncome,
        totalExpenses: metric.totalExpenses,
        netProfit: metric.netProfit,
        rating: metric.rating || 0,
      })),
    });

  } catch (error) {
    console.error('Error in admin driver API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch driver details' },
      { status: 500 }
    );
  }
}

// DELETE handler
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: driverId } = await params;
    
    console.log('🗑️ Deleting driver:', driverId);
    
    const auth = await verifyAuth(request);
    
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: auth.status || 401 }
      );
    }

    const userEmail = auth.user.email;
    const isEnvAdmin = isAdminEmail(userEmail);
    
    // Check admin access
    let isAdmin = isEnvAdmin;
    
    if (!isEnvAdmin) {
      const adminRecord = await prisma.user.findUnique({
        where: { email: userEmail },
        include: { admin: true }
      });
      isAdmin = adminRecord?.admin !== null;
    }

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Check if driver exists
    const driver = await prisma.driver.findUnique({
      where: { id: driverId }
    });

    if (!driver) {
      return NextResponse.json(
        { error: 'Driver not found' },
        { status: 404 }
      );
    }

    // Delete the driver
    await prisma.driver.delete({
      where: { id: driverId }
    });

    console.log('✅ Driver deleted successfully:', driverId);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Driver deleted successfully' 
    });
    
  } catch (error: any) {
    console.error('Error deleting driver:', error);
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Driver not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to delete driver' },
      { status: 500 }
    );
  }
}