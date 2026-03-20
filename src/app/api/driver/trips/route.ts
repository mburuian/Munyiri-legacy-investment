import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { verifyDriverAuth } from '../../../../lib/firebase/admin';

export async function POST(request: NextRequest) {
  try {
    console.log('='.repeat(50));
    console.log('🚀 Driver Trip API Called');
    console.log('='.repeat(50));
    
    // Verify Firebase authentication
    console.log('\n📝 Verifying Firebase driver authentication...');
    const auth = await verifyDriverAuth(request);
    
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
      email: auth.user?.email
    });

    const firebaseEmail = auth.user?.email;
    const firebaseUid = auth.user?.uid;

    if (!firebaseEmail) {
      console.log('❌ No email in Firebase user');
      return NextResponse.json(
        { error: 'Invalid user data' },
        { status: 400 }
      );
    }

    // Find the user and their driver profile with assigned vehicle
    console.log('\n🔍 Looking up driver in database...');
    
    const dbUser = await prisma.user.findFirst({
      where: {
        OR: [
          { id: firebaseUid },
          { email: firebaseEmail }
        ]
      },
      include: {
        driver: {
          include: {
            assignedVehicle: true
          }
        }
      }
    });

    if (!dbUser) {
      console.log('❌ User not found in database');
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (!dbUser.driver) {
      console.log('❌ User has no driver profile');
      return NextResponse.json(
        { error: 'Driver profile not found' },
        { status: 404 }
      );
    }

    if (!dbUser.driver.assignedVehicle) {
      console.log('❌ Driver has no assigned vehicle');
      return NextResponse.json(
        { error: 'No vehicle assigned. Please contact admin.' },
        { status: 400 }
      );
    }

    const driver = dbUser.driver;
    const vehicle = dbUser.driver.assignedVehicle;
    
    console.log('✅ Driver found:', driver.id);
    console.log('✅ Vehicle found:', vehicle.id);

    // Parse request body
    const body = await request.json();
    console.log('📦 Request body:', body);
    
    const {
      startLocation,
      endLocation,
      distance,
      fare,
      notes,
      startTime,
      endTime
    } = body;

    // Validate required fields (now only location and distance are required)
    if (!startLocation || !endLocation || !distance) {
      return NextResponse.json(
        { error: 'Missing required fields: startLocation, endLocation, and distance are required' },
        { status: 400 }
      );
    }

    // Parse distance
    const distanceNum = parseFloat(distance);
    if (isNaN(distanceNum) || distanceNum <= 0) {
      return NextResponse.json(
        { error: 'Invalid distance' },
        { status: 400 }
      );
    }

    // Parse fare if provided
    const fareNum = fare ? parseFloat(fare) : null;

    // Set default times if not provided
    const now = new Date();
    const startDateTime = startTime ? new Date(startTime) : now;
    const endDateTime = endTime ? new Date(endTime) : now;

    // Get current odometer reading from last trip
    const lastTrip = await prisma.trip.findFirst({
      where: { vehicleId: vehicle.id },
      orderBy: { endTime: 'desc' },
      select: { endOdometer: true }
    });

    const startOdometer = lastTrip?.endOdometer || 0;
    const endOdometer = startOdometer + Math.round(distanceNum);

    // Create the trip
    console.log('\n💾 Creating trip record...');
    
    const trip = await prisma.trip.create({
      data: {
        vehicleId: vehicle.id,
        driverId: driver.id,
        startTime: startDateTime,
        endTime: endDateTime,
        startLocation,
        endLocation,
        distanceKm: distanceNum,
        startOdometer,
        endOdometer,
        fare: fareNum,
        notes: notes || '',
        status: 'COMPLETED'
      },
      include: {
        vehicle: {
          select: {
            plateNumber: true,
            model: true
          }
        },
        driver: {
          select: {
            licenseNumber: true,
            user: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    console.log('✅ Trip created:', trip.id);

    // Create income log for the trip fare
    if (fareNum && fareNum > 0) {
      await prisma.incomeLog.create({
        data: {
          vehicleId: vehicle.id,
          driverId: driver.id,
          amount: fareNum,
          type: 'TRIP_FARE',
          description: `Trip fare: ${startLocation} to ${endLocation}`,
          date: new Date(),
          tripStart: startDateTime,
          tripEnd: endDateTime,
          distanceKm: distanceNum,
          startOdometer,
          endOdometer
        }
      });
      console.log('💰 Income log created');
    }

    // Check for maintenance alerts based on odometer
    const upcomingMaintenance = await prisma.maintenance.findFirst({
      where: {
        vehicleId: vehicle.id,
        status: 'PENDING',
        nextDueKm: {
          not: null,
          lte: endOdometer + 500 // Alert when within 500km of service
        }
      }
    });

    if (upcomingMaintenance) {
      // Create alert for upcoming maintenance
      await prisma.alert.create({
        data: {
          vehicleId: vehicle.id,
          driverId: driver.id,
          type: 'MAINTENANCE',
          severity: 'MEDIUM',
          title: 'Service Due Soon',
          description: `Vehicle due for ${upcomingMaintenance.type.replace(/_/g, ' ').toLowerCase()} in ${(upcomingMaintenance.nextDueKm || 0) - endOdometer}km`,
          dueDate: upcomingMaintenance.nextDueDate
        }
      });
      console.log('⚠️ Maintenance alert created');
    }

    // Update performance metrics
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.performanceMetrics.upsert({
      where: {
        driverId_date: {
          driverId: driver.id,
          date: today
        }
      },
      update: {
        tripsCount: { increment: 1 },
        totalIncome: { increment: fareNum || 0 },
        netProfit: { increment: fareNum || 0 }
      },
      create: {
        driverId: driver.id,
        date: today,
        tripsCount: 1,
        totalIncome: fareNum || 0,
        totalExpenses: 0,
        netProfit: fareNum || 0
      }
    });

    const response = {
      success: true,
      message: 'Trip logged successfully',
      trip: {
        id: trip.id,
        startLocation: trip.startLocation,
        endLocation: trip.endLocation,
        startTime: trip.startTime.toISOString(),
        endTime: trip.endTime?.toISOString(),
        distance: trip.distanceKm,
        fare: trip.fare,
        startOdometer: trip.startOdometer,
        endOdometer: trip.endOdometer,
        vehicle: trip.vehicle ? `${trip.vehicle.plateNumber} - ${trip.vehicle.model}` : 'Unknown',
        driver: trip.driver?.user?.name || 'Unknown'
      },
      stats: {
        totalDistance: endOdometer,
        tripDistance: distanceNum,
        earnings: fareNum || 0
      }
    };

    console.log('✅ Response prepared');
    console.log('='.repeat(50));

    return NextResponse.json(response, { status: 201 });

  } catch (error: any) {
    console.error('❌ Error creating trip:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { error: error.message || 'Failed to create trip' },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch trips (unchanged)
export async function GET(request: NextRequest) {
  // ... keep your existing GET function exactly as is ...
  try {
    console.log('='.repeat(50));
    console.log('🚀 Driver Trips GET API Called');
    console.log('='.repeat(50));
    
    // Verify Firebase authentication
    console.log('\n📝 Verifying Firebase driver authentication...');
    const auth = await verifyDriverAuth(request);
    
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
      email: auth.user?.email
    });

    const firebaseEmail = auth.user?.email;
    const firebaseUid = auth.user?.uid;

    if (!firebaseEmail) {
      console.log('❌ No email in Firebase user');
      return NextResponse.json(
        { error: 'Invalid user data' },
        { status: 400 }
      );
    }

    // Find the driver
    const dbUser = await prisma.user.findFirst({
      where: {
        OR: [
          { id: firebaseUid },
          { email: firebaseEmail }
        ]
      },
      include: {
        driver: true
      }
    });

    if (!dbUser?.driver) {
      return NextResponse.json(
        { error: 'Driver not found' },
        { status: 404 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');

    // Build where clause
    const where: any = {
      driverId: dbUser.driver.id
    };

    if (status) {
      where.status = status.toUpperCase();
    }

    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) {
        where.startTime.gte = new Date(startDate);
      }
      if (endDate) {
        where.startTime.lte = new Date(endDate);
      }
    }

    // Fetch trips
    const trips = await prisma.trip.findMany({
      where,
      orderBy: { startTime: 'desc' },
      take: limit,
      include: {
        vehicle: {
          select: {
            plateNumber: true,
            model: true
          }
        }
      }
    });

    // Get summary statistics
    const summary = await prisma.trip.aggregate({
      where: {
        driverId: dbUser.driver.id
      },
      _sum: {
        distanceKm: true,
        fare: true
      },
      _count: true,
      _avg: {
        distanceKm: true,
        fare: true
      }
    });

    // Get today's trips
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayTrips = await prisma.trip.count({
      where: {
        driverId: dbUser.driver.id,
        startTime: {
          gte: today
        }
      }
    });

    const response = {
      trips: trips.map(trip => ({
        id: trip.id,
        date: trip.startTime.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        }),
        startTime: trip.startTime.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        endTime: trip.endTime ? new Date(trip.endTime).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        }) : null,
        from: trip.startLocation,
        to: trip.endLocation,
        distance: trip.distanceKm,
        earnings: trip.fare,
        status: trip.status.toLowerCase(),
        vehicle: trip.vehicle ? `${trip.vehicle.plateNumber} - ${trip.vehicle.model}` : 'Unknown'
      })),
      summary: {
        totalTrips: summary._count,
        totalDistance: summary._sum.distanceKm || 0,
        totalEarnings: summary._sum.fare || 0,
        averageDistance: summary._avg.distanceKm || 0,
        averageFare: summary._avg.fare || 0,
        todayTrips
      }
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('❌ Error fetching trips:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch trips' },
      { status: 500 }
    );
  }
}