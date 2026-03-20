import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { verifyDriverAuth } from '../../../../lib/firebase/admin';
import { Driver, User, Vehicle, Trip, Expense, IncomeLog, PerformanceMetrics, Alert } from '@prisma/client';

// Define the shape of our database response
type UserWithDriver = User & {
  driver: (Driver & {
    assignedVehicle: (Vehicle & {
      documents: any[];
      maintenance: any[];
      trips: any[];
    }) | null;
    trips: (Trip & {
      vehicle: Pick<Vehicle, 'plateNumber' | 'model'>;
    })[];
    expenses: Expense[];
    incomeLogs: IncomeLog[];
    performanceMetrics: PerformanceMetrics[];
    alerts: Alert[];
  }) | null;
};

// Define the shape of our API response
type DriverProfileResponse = {
  driver: {
    id: string;
    name: string | null;
    email: string;
    phone: string;
    avatar: string | null;
    licenseNumber: string;
    status: string;
    rating: number;
    tripsCompleted: number;
    totalRevenue: number;
    firebaseUid: string;
  };
  vehicle: {
    id: string;
    plateNumber: string;
    model: string;
    capacity: number;
    status: string;
    odometer: number;
    nextService: string;
    insuranceExpiry: string;
    fuelLevel: number;
  } | null;
  recentTrips: Array<{
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    from: string;
    to: string;
    distance: number;
    earnings: number;
    status: string;
    vehicleInfo: string;
  }>;
  recentExpenses: Array<{
    id: string;
    category: string;
    amount: number;
    date: string;
    description: string;
    status: string;
  }>;
  recentIncome: Array<{
    id: string;
    type: string;
    amount: number;
    date: string;
    description: string;
  }>;
  activeAlerts: Array<{
    id: string;
    type: string;
    severity: string;
    title: string;
    description: string;
    dueDate?: string;
  }>;
  stats: {
    todayEarnings: number;
    todayTrips: number;
    weekEarnings: number;
    monthEarnings: number;
    totalTrips: number;
    fuelLogged: number;
    rating: number;
    rank: number;
    fuelEfficiency: number;
  };
};

type AuthUser = {
  uid: string;
  email: string;
  name?: string;
  picture?: string;
  role?: string;
  phone?: string;
};

export async function GET(request: NextRequest) {
  try {
    console.log('='.repeat(50));
    console.log('🚀 Driver Profile API Called');
    console.log('='.repeat(50));
    
    // Verify Firebase authentication
    console.log('\n📝 Verifying Firebase driver authentication...');
    const auth = await verifyDriverAuth(request);
    console.log('Auth result:', JSON.stringify(auth, null, 2));
    
    if (!auth.authenticated) {
      console.log('❌ Authentication failed:', auth.error);
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    console.log('\n✅ Firebase authentication successful');
    console.log('Firebase user:', {
      uid: auth.user?.uid,
      email: auth.user?.email,
      role: auth.user?.role
    });

    const firebaseUser = auth.user as AuthUser;
    const firebaseUid = firebaseUser?.uid;
    const firebaseEmail = firebaseUser?.email;

    if (!firebaseEmail) {
      console.log('❌ No email in Firebase user');
      return NextResponse.json(
        { error: 'Invalid user data' },
        { status: 400 }
      );
    }

    // Find or create user with proper typing
    console.log('\n🔍 Looking up user in database...');
    
    // First, try to find existing user
    let existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { id: firebaseUid },
          { email: firebaseEmail }
        ]
      }
    });

    // If user doesn't exist, create them
    if (!existingUser) {
      console.log('👤 User not found in database, creating new user record...');
      
      try {
        existingUser = await prisma.user.create({
          data: {
            id: firebaseUid,
            email: firebaseEmail,
            name: firebaseUser?.name || firebaseEmail.split('@')[0],
            role: 'DRIVER',
            phone: firebaseUser?.phone || null,
            avatar: firebaseUser?.picture || null,
            password: '' // Empty password since using Firebase
          }
        });
        console.log('✅ User created in database:', existingUser.id);
      } catch (createError) {
        console.error('❌ Failed to create user:', createError);
        return NextResponse.json(
          { error: 'Failed to create user record' },
          { status: 500 }
        );
      }
    }

    if (!existingUser) {
      console.log('❌ Failed to get or create user');
      return NextResponse.json(
        { error: 'User record not found' },
        { status: 404 }
      );
    }

    // Now get full user with driver data
    const userWithDriver = await prisma.user.findUnique({
      where: { id: existingUser.id },
      include: {
        driver: {
          include: {
            assignedVehicle: {
              include: {
                documents: {
                  where: {
                    type: 'INSURANCE'
                  },
                  take: 1,
                  orderBy: { uploadedAt: 'desc' }
                },
                maintenance: {
                  where: {
                    status: 'PENDING'
                  },
                  orderBy: { date: 'asc' },
                  take: 1
                },
                trips: {
                  orderBy: { startTime: 'desc' },
                  take: 1,
                  select: {
                    endOdometer: true
                  }
                }
              }
            },
            trips: {
              take: 10,
              orderBy: { startTime: 'desc' },
              include: {
                vehicle: {
                  select: {
                    plateNumber: true,
                    model: true
                  }
                }
              }
            },
            expenses: {
              take: 10,
              orderBy: { date: 'desc' }
            },
            incomeLogs: {
              take: 10,
              orderBy: { date: 'desc' }
            },
            performanceMetrics: {
              take: 30,
              orderBy: { date: 'desc' }
            },
            alerts: {
              where: { resolved: false },
              orderBy: { severity: 'desc' },
              take: 5
            }
          }
        }
      }
    }) as UserWithDriver | null;

    if (!userWithDriver) {
      console.log('❌ Failed to fetch user with driver data');
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user has a driver profile
    if (!userWithDriver.driver) {
      console.log('❌ User exists but has no driver profile');
      
      // In development, create a mock driver profile
      if (process.env.NODE_ENV === 'development' && process.env.CREATE_MOCK_DRIVER === 'true') {
        console.log('🔧 Development mode: Creating mock driver profile');
        
        try {
          const mockDriver = await prisma.driver.create({
            data: {
              userId: userWithDriver.id,
              licenseNumber: `DEV${Math.floor(Math.random() * 1000000)}`,
              status: 'ACTIVE'
            }
          });
          
          // Redirect to get the full profile with the new driver
          return NextResponse.redirect(new URL('/api/driver/profile', request.url));
        } catch (createError) {
          console.error('❌ Failed to create mock driver:', createError);
          return NextResponse.json(
            { 
              error: 'Driver profile not found',
              message: 'User exists but needs to be registered as a driver'
            },
            { status: 404 }
          );
        }
      } else {
        return NextResponse.json(
          { 
            error: 'Driver profile not found',
            message: 'User exists but needs to be registered as a driver'
          },
          { status: 404 }
        );
      }
    }

    const driver = userWithDriver.driver;
    console.log('✅ Driver found in database:', driver.id);

    // Calculate statistics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    // Safely access data
    const trips = driver.trips || [];
    const expenses = driver.expenses || [];
    const incomeLogs = driver.incomeLogs || [];
    const performanceMetrics = driver.performanceMetrics || [];
    const alerts = driver.alerts || [];

    // Get today's trips and earnings
    const todayTrips = trips.filter((trip: Trip) => 
      trip.startTime && new Date(trip.startTime) >= today
    );

    const todayEarnings = todayTrips.reduce((sum: number, trip: Trip) => sum + (trip.fare || 0), 0);

    // Get week's earnings
    const weekTrips = trips.filter((trip: Trip) => 
      trip.startTime && new Date(trip.startTime) >= weekAgo
    );
    
    const weekEarnings = weekTrips.reduce((sum: number, trip: Trip) => sum + (trip.fare || 0), 0);

    // Get month's earnings
    const monthTrips = trips.filter((trip: Trip) => 
      trip.startTime && new Date(trip.startTime) >= monthAgo
    );
    
    const monthEarnings = monthTrips.reduce((sum: number, trip: Trip) => sum + (trip.fare || 0), 0);

    // Get latest performance metrics
    const latestMetrics = performanceMetrics[0] || null;

    // Calculate fuel logged (from expenses)
    const fuelExpenses = expenses.filter((exp: Expense) => exp.category === 'FUEL');
    const fuelLogged = fuelExpenses.reduce((sum: number, exp: Expense) => sum + (exp.amount || 0), 0) / 150;

    // Calculate rank
    let rank = 1;
    try {
      const betterDrivers = await prisma.performanceMetrics.count({
        where: {
          date: {
            gte: monthAgo
          },
          rating: {
            gt: latestMetrics?.rating || 0
          }
        }
      });
      rank = betterDrivers + 1;
    } catch (rankError) {
      console.error('Error calculating rank:', rankError);
    }

    // Get the latest odometer reading
    const latestTrip = trips[0];
    const currentOdometer = latestTrip?.endOdometer || 0;

    // Format vehicle data
    const assignedVehicle = driver.assignedVehicle;
    const vehicle = assignedVehicle ? {
      id: assignedVehicle.id,
      plateNumber: assignedVehicle.plateNumber,
      model: assignedVehicle.model,
      capacity: assignedVehicle.capacity,
      status: assignedVehicle.status?.toLowerCase() || 'unknown',
      odometer: currentOdometer,
      nextService: assignedVehicle.maintenance?.[0]?.date 
        ? new Date(assignedVehicle.maintenance[0].date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          })
        : 'Not scheduled',
      insuranceExpiry: assignedVehicle.documents?.[0]?.expiryDate
        ? new Date(assignedVehicle.documents[0].expiryDate).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          })
        : 'Not set',
      fuelLevel: 75
    } : null;

    // Format trips for frontend
    const recentTrips = trips.map((trip: Trip & { vehicle?: { plateNumber: string; model: string } }) => ({
      id: trip.id,
      date: trip.startTime ? new Date(trip.startTime).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }) : 'Unknown',
      startTime: trip.startTime ? new Date(trip.startTime).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      }) : 'Unknown',
      endTime: trip.endTime ? new Date(trip.endTime).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      }) : 'In progress',
      from: trip.startLocation || 'Unknown',
      to: trip.endLocation || 'Unknown',
      distance: trip.distanceKm || 0,
      earnings: trip.fare || 0,
      status: trip.status?.toLowerCase() || 'unknown',
      vehicleInfo: trip.vehicle ? `${trip.vehicle.plateNumber} - ${trip.vehicle.model}` : 'Unknown'
    }));

    // Format expenses for frontend
    const recentExpenses = expenses.map((expense: Expense) => ({
      id: expense.id,
      category: expense.category?.toLowerCase() || 'other',
      amount: expense.amount || 0,
      date: expense.date ? new Date(expense.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }) : 'Unknown',
      description: expense.description || '',
      status: expense.approved ? 'approved' : 'pending'
    }));

    // Format income logs for frontend
    const recentIncome = incomeLogs.map((income: IncomeLog) => ({
      id: income.id,
      type: income.type?.toLowerCase() || 'other',
      amount: income.amount || 0,
      date: income.date ? new Date(income.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }) : 'Unknown',
      description: income.description || `${income.type || 'Payment'}`
    }));

    // Format alerts for frontend
    const activeAlerts = alerts.map((alert: Alert) => ({
      id: alert.id,
      type: alert.type?.toLowerCase() || 'general',
      severity: alert.severity?.toLowerCase() || 'medium',
      title: alert.title || 'Alert',
      description: alert.description || '',
      dueDate: alert.dueDate ? new Date(alert.dueDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }) : undefined
    }));

    const response: DriverProfileResponse = {
      driver: {
        id: driver.id,
        name: userWithDriver.name || 'Driver',
        email: userWithDriver.email,
        phone: userWithDriver.phone || '',
        avatar: userWithDriver.avatar,
        licenseNumber: driver.licenseNumber,
        status: driver.status?.toLowerCase() || 'off_duty',
        rating: latestMetrics?.rating || 0,
        tripsCompleted: latestMetrics?.tripsCount || 0,
        totalRevenue: latestMetrics?.totalIncome || 0,
        firebaseUid: firebaseUid
      },
      vehicle,
      recentTrips,
      recentExpenses,
      recentIncome,
      activeAlerts,
      stats: {
        todayEarnings,
        todayTrips: todayTrips.length,
        weekEarnings,
        monthEarnings,
        totalTrips: latestMetrics?.tripsCount || 0,
        fuelLogged: parseFloat(fuelLogged.toFixed(1)) || 0,
        rating: latestMetrics?.rating || 0,
        rank,
        fuelEfficiency: latestMetrics?.fuelEfficiency || 0
      }
    };

    console.log('✅ Response prepared successfully');
    console.log('Response stats:', response.stats);
    console.log('='.repeat(50));

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('❌ Error fetching driver profile:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch driver profile' },
      { status: 500 }
    );
  }
}