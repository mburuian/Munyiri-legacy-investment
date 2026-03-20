// app/api/admin/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { verifyAuth } from '../../../../lib/firebase/admin';

export async function GET(request: NextRequest) {
  try {
    console.log('📊 [STATS_GET] Verifying authentication...');
    
    // Verify the Firebase token
    const auth = await verifyAuth(request);
    
    if (!auth.authenticated) {
      console.log('❌ Authentication failed:', auth.error);
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' }, 
        { status: auth.status || 401 }
      );
    }

    console.log('✅ User authenticated:', { 
      email: auth.user?.email, 
      role: auth.user?.role 
    });

    // ✅ NO DATABASE USER LOOKUP - Using auth.user directly
    // Check if user has admin role from token
    if (auth.user?.role !== 'ADMIN' && auth.user?.role !== 'FLEET_MANAGER') {
      console.log('❌ Forbidden - User is not admin:', auth.user?.role);
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' }, 
        { status: 403 }
      );
    }

    console.log('✅ Admin access granted for:', auth.user?.email);

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get month date range
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    console.log('📅 Date ranges:', {
      today: today.toISOString(),
      tomorrow: tomorrow.toISOString(),
      monthStart: monthStart.toISOString()
    });

    // Fetch counts and sums in parallel
    console.log('🔄 Fetching stats from database...');
    const [
      totalUsers,
      totalDrivers,
      totalAdmins,
      totalVehicles,
      activeVehicles,
      vehiclesInMaintenance,
      todayTrips,
      monthTrips,
      todayIncome,
      monthIncome,
      todayExpenses,
      monthExpenses,
      activeAlerts,
      criticalAlerts,
      todayDocuments,
      expiringDocuments
    ] = await Promise.all([
      // User counts
      prisma.user.count(),
      prisma.driver.count(),
      prisma.admin.count(),
      
      // Vehicle stats
      prisma.vehicle.count(),
      prisma.vehicle.count({ where: { status: 'ACTIVE' } }),
      prisma.vehicle.count({ where: { status: 'MAINTENANCE' } }),
      
      // Trip stats
      prisma.trip.count({
        where: {
          startTime: { gte: today, lt: tomorrow }
        }
      }),
      prisma.trip.count({
        where: {
          startTime: { gte: monthStart }
        }
      }),
      
      // Income stats
      prisma.incomeLog.aggregate({
        where: { date: { gte: today, lt: tomorrow } },
        _sum: { amount: true }
      }),
      prisma.incomeLog.aggregate({
        where: { date: { gte: monthStart } },
        _sum: { amount: true }
      }),
      
      // Expense stats
      prisma.expense.aggregate({
        where: { date: { gte: today, lt: tomorrow } },
        _sum: { amount: true }
      }),
      prisma.expense.aggregate({
        where: { date: { gte: monthStart } },
        _sum: { amount: true }
      }),
      
      // Alert stats
      prisma.alert.count({ where: { resolved: false } }),
      prisma.alert.count({ where: { resolved: false, severity: 'CRITICAL' } }),
      
      // Document stats
      prisma.document.count({
        where: { uploadedAt: { gte: today, lt: tomorrow } }
      }),
      prisma.document.count({
        where: {
          expiryDate: {
            lte: new Date(new Date().setMonth(new Date().getMonth() + 1))
          }
        }
      })
    ]);

    console.log('✅ Stats fetched successfully:', {
      users: totalUsers,
      drivers: totalDrivers,
      vehicles: totalVehicles,
      todayIncome: todayIncome._sum.amount || 0,
      todayExpenses: todayExpenses._sum.amount || 0
    });

    return NextResponse.json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          drivers: totalDrivers,
          admins: totalAdmins,
        },
        vehicles: {
          total: totalVehicles,
          active: activeVehicles,
          maintenance: vehiclesInMaintenance,
        },
        trips: {
          today: todayTrips,
          month: monthTrips,
        },
        income: {
          today: todayIncome._sum.amount || 0,
          month: monthIncome._sum.amount || 0,
        },
        expenses: {
          today: todayExpenses._sum.amount || 0,
          month: monthExpenses._sum.amount || 0,
        },
        alerts: {
          active: activeAlerts,
          critical: criticalAlerts,
        },
        documents: {
          today: todayDocuments,
          expiringSoon: expiringDocuments,
        },
        profit: {
          today: (todayIncome._sum.amount || 0) - (todayExpenses._sum.amount || 0),
          month: (monthIncome._sum.amount || 0) - (monthExpenses._sum.amount || 0),
        }
      }
    });

  } catch (error: any) {
    console.error('❌ Error fetching admin stats:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch admin stats',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}