// app/api/admin/drivers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { verifyAuth } from '../../../../lib/firebase/admin'; // Fixed import path
import { DriverStatus } from '@prisma/client';
import admin from 'firebase-admin';

// ==================== GET METHOD with enhanced logging ====================
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  console.log('\n🚀 [DRIVERS_GET] ====================');
  console.log('📋 Method: GET /api/admin/drivers');
  console.log('⏰ Time:', new Date().toISOString());

  try {
    // Step 1: Authentication
    console.log('🔑 Step 1: Verifying authentication...');
    const auth = await verifyAuth(request);
    console.log('   └─ Authenticated:', auth.authenticated);
    console.log('   └─ User email:', auth.user?.email || 'N/A');
    console.log('   └─ Auth status:', auth.status || 200);

    if (!auth.authenticated) {
      console.log('❌ Authentication failed:', auth.error);
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    // Step 2: Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'name';
    const sortOrder = searchParams.get('sortOrder') || 'asc';
    const assigned = searchParams.get('assigned');

    console.log('📊 Step 2: Query parameters:', {
      page,
      limit,
      status,
      search,
      sortBy,
      sortOrder,
      assigned
    });

    const skip = (page - 1) * limit;

    // Step 3: Build where clause
    console.log('🔨 Step 3: Building where clause...');
    const where: any = {};

    // Map status string to enum value
    if (status && status !== 'all') {
      const statusMap: Record<string, DriverStatus> = {
        'active': 'ACTIVE',
        'off-duty': 'OFF_DUTY',
        'on-leave': 'ON_LEAVE',
        'suspended': 'SUSPENDED',
        'terminated': 'TERMINATED'
      };
      where.status = statusMap[status.toLowerCase()];
      console.log('   └─ Status filter:', where.status);
    }

    if (assigned === 'assigned') {
      where.assignedVehicle = { isNot: null };
      console.log('   └─ Filter: Assigned drivers only');
    } else if (assigned === 'unassigned') {
      where.assignedVehicle = { is: null };
      console.log('   └─ Filter: Unassigned drivers only');
    }

    if (search) {
      where.OR = [
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { phone: { contains: search, mode: 'insensitive' } } },
        { licenseNumber: { contains: search, mode: 'insensitive' } }
      ];
      console.log('   └─ Search term:', search);
    }

    // Step 4: Build orderBy
    let orderBy: any = {};
    if (sortBy === 'name') {
      orderBy = { user: { name: sortOrder } };
    } else {
      orderBy = { createdAt: sortOrder };
    }
    console.log('   └─ Order by:', orderBy);

    // Step 5: Fetch drivers
    console.log('📦 Step 5: Fetching drivers from database...');
    const [drivers, total] = await Promise.all([
      prisma.driver.findMany({
        where,
        include: {
          user: {
            select: {
              name: true,
              email: true,
              phone: true,
              avatar: true
            }
          },
          assignedVehicle: {
            select: {
              id: true,
              plateNumber: true,
              model: true,
              capacity: true,
              status: true
            }
          },
          performanceMetrics: {
            take: 1,
            orderBy: { date: 'desc' },
            select: {
              tripsCount: true,
              totalIncome: true,
              rating: true
            }
          }
        },
        orderBy,
        skip,
        take: limit
      }),
      prisma.driver.count({ where })
    ]);

    console.log(`   └─ Found ${drivers.length} drivers (total: ${total})`);

    // Step 6: Get summary statistics
    console.log('📊 Step 6: Fetching summary statistics...');
    const [
      totalDrivers,
      activeDrivers,
      offDutyDrivers,
      onLeaveDrivers,
      suspendedDrivers,
      terminatedDrivers,
      assignedDrivers,
      unassignedDrivers
    ] = await Promise.all([
      prisma.driver.count(),
      prisma.driver.count({ where: { status: 'ACTIVE' as DriverStatus } }),
      prisma.driver.count({ where: { status: 'OFF_DUTY' as DriverStatus } }),
      prisma.driver.count({ where: { status: 'ON_LEAVE' as DriverStatus } }),
      prisma.driver.count({ where: { status: 'SUSPENDED' as DriverStatus } }),
      prisma.driver.count({ where: { status: 'TERMINATED' as DriverStatus } }),
      prisma.driver.count({ where: { assignedVehicle: { isNot: null } } }),
      prisma.driver.count({ where: { assignedVehicle: { is: null } } })
    ]);

    console.log('   └─ Summary:', {
      total: totalDrivers,
      active: activeDrivers,
      assigned: assignedDrivers,
      unassigned: unassignedDrivers
    });

    const summary = {
      totalDrivers,
      activeDrivers,
      offDutyDrivers,
      onLeaveDrivers,
      suspendedDrivers,
      terminatedDrivers,
      assignedDrivers,
      unassignedDrivers
    };

    // Step 7: Transform response
    console.log('🔄 Step 7: Transforming response...');
    const transformedDrivers = drivers.map(driver => {
      const latestMetrics = driver.performanceMetrics[0] || null;
      
      return {
        id: driver.id,
        userId: driver.userId,
        name: driver.user?.name || 'Unknown',
        email: driver.user?.email || '',
        phone: driver.user?.phone || '',
        avatar: driver.user?.avatar,
        licenseNumber: driver.licenseNumber,
        status: driver.status.toLowerCase(),
        createdAt: driver.createdAt,
        rating: latestMetrics?.rating || null,
        tripsCompleted: latestMetrics?.tripsCount || 0,
        totalRevenue: latestMetrics?.totalIncome || 0,
        assignedVehicle: driver.assignedVehicle ? {
          id: driver.assignedVehicle.id,
          plateNumber: driver.assignedVehicle.plateNumber,
          model: driver.assignedVehicle.model,
          capacity: driver.assignedVehicle.capacity,
          status: driver.assignedVehicle.status
        } : null
      };
    });

    const duration = Date.now() - startTime;
    console.log(`✅ [DRIVERS_GET] Completed in ${duration}ms`);
    console.log('====================\n');

    return NextResponse.json({
      drivers: transformedDrivers,
      summary,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`❌ [DRIVERS_GET] Error after ${duration}ms:`, error);
    console.error('   └─ Name:', error.name);
    console.error('   └─ Message:', error.message);
    console.error('   └─ Stack:', error.stack);
    console.error('====================\n');

    return NextResponse.json(
      { error: error.message || 'Failed to fetch drivers' },
      { status: 500 }
    );
  }
}

// ==================== POST METHOD with enhanced logging ====================
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('\n🚀 [DRIVERS_POST] ====================');
  console.log('📋 Method: POST /api/admin/drivers');
  console.log('⏰ Time:', new Date().toISOString());

  try {
    // Step 1: Authentication
    console.log('🔑 Step 1: Verifying authentication...');
    const auth = await verifyAuth(request);
    console.log('   └─ Authenticated:', auth.authenticated);
    console.log('   └─ User email:', auth.user?.email || 'N/A');

    if (!auth.authenticated) {
      console.log('❌ Authentication failed:', auth.error);
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    // Step 2: Parse request body
    console.log('📦 Step 2: Parsing request body...');
    const body = await request.json();
    console.log('   └─ Body:', {
      email: body.email,
      name: body.name,
      phone: body.phone,
      licenseNumber: body.licenseNumber,
      status: body.status,
      vehicleId: body.vehicleId || 'none'
    });

    // Step 3: Validate required fields
    console.log('✅ Step 3: Validating fields...');
    if (!body.email || !body.name || !body.phone || !body.licenseNumber) {
      console.log('❌ Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Step 4: Generate OTP
    console.log('🔐 Step 4: Generating OTP...');
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date();
    otpExpiry.setMinutes(otpExpiry.getMinutes() + 15);
    console.log('   └─ OTP generated:', { otp, expiresAt: otpExpiry.toISOString() });

    // Step 5: Map status
    const statusMap: Record<string, DriverStatus> = {
      'active': 'ACTIVE',
      'off-duty': 'OFF_DUTY',
      'on-leave': 'ON_LEAVE',
      'suspended': 'SUSPENDED',
      'terminated': 'TERMINATED'
    };

    // Step 6: Check if user already exists
    console.log('🔍 Step 6: Checking for existing user...');
    const existingUser = await prisma.user.findUnique({
      where: { email: body.email }
    });

    if (existingUser) {
      console.log('❌ User already exists:', existingUser.id);
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }
    console.log('   └─ Email available');

    // Step 7: Create Firebase user
    console.log('🔥 Step 7: Creating Firebase user...');
    let firebaseUser;
    try {
      firebaseUser = await admin.auth().createUser({
        email: body.email,
        password: otp,
        displayName: body.name,
        phoneNumber: body.phone,
      });

      console.log('   └─ Firebase user created:', {
        uid: firebaseUser.uid,
        email: firebaseUser.email
      });

      // Set custom claims
      await admin.auth().setCustomUserClaims(firebaseUser.uid, {
        role: 'DRIVER',
        mustChangePassword: true,
        otp: otp,
        otpExpiry: otpExpiry.getTime(),
        isFirstLogin: true
      });
      console.log('   └─ Custom claims set');
    } catch (firebaseError: any) {
      console.error('❌ Firebase user creation error:', firebaseError);
      
      if (firebaseError.code === 'auth/email-already-exists') {
        return NextResponse.json(
          { error: 'Email already registered in Firebase' },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: `Failed to create Firebase user: ${firebaseError.message}` },
        { status: 400 }
      );
    }

    // Step 8: Create Prisma user
    console.log('💾 Step 8: Creating Prisma user...');
    let user;
    try {
      user = await prisma.user.create({
        data: {
          id: firebaseUser.uid,
          email: body.email,
          name: body.name,
          phone: body.phone,
          password: 'FIREBASE_AUTH_MANAGED',
          role: 'DRIVER'
        }
      });
      console.log('   └─ Prisma user created:', user.id);
    } catch (prismaError) {
      console.error('❌ Prisma user creation error:', prismaError);
      await admin.auth().deleteUser(firebaseUser.uid);
      return NextResponse.json(
        { error: 'Failed to create user record in database' },
        { status: 500 }
      );
    }

    // Step 9: Create driver record
    console.log('👤 Step 9: Creating driver record...');
    let driver;
    try {
      driver = await prisma.driver.create({
        data: {
          userId: user.id,
          licenseNumber: body.licenseNumber,
          status: statusMap[body.status?.toLowerCase()] || 'ACTIVE',
          ...(body.vehicleId && {
            assignedVehicle: {
              connect: { id: body.vehicleId }
            }
          })
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
              phone: true,
              avatar: true
            }
          },
          assignedVehicle: {
            select: {
              id: true,
              plateNumber: true,
              model: true,
              capacity: true,
              status: true
            }
          }
        }
      });
      console.log('   └─ Driver created:', driver.id);
    } catch (prismaError) {
      console.error('❌ Driver creation error:', prismaError);
      await prisma.user.delete({ where: { id: user.id } });
      await admin.auth().deleteUser(firebaseUser.uid);
      return NextResponse.json(
        { error: 'Failed to create driver record' },
        { status: 500 }
      );
    }

    // Step 10: Create performance metrics
    console.log('📊 Step 10: Creating performance metrics...');
    try {
      await prisma.performanceMetrics.create({
        data: {
          driverId: driver.id,
          date: new Date(),
          tripsCount: 0,
          totalIncome: 0,
          totalExpenses: 0,
          netProfit: 0
        }
      });
      console.log('   └─ Performance metrics created');
    } catch (metricsError) {
      console.error('⚠️ Failed to create performance metrics:', metricsError);
    }

    // Step 11: Transform response
    console.log('🔄 Step 11: Transforming response...');
    const transformedDriver = {
      id: driver.id,
      userId: driver.userId,
      name: driver.user?.name,
      email: driver.user?.email,
      phone: driver.user?.phone,
      avatar: driver.user?.avatar,
      licenseNumber: driver.licenseNumber,
      status: driver.status.toLowerCase(),
      createdAt: driver.createdAt,
      rating: null,
      tripsCompleted: 0,
      totalRevenue: 0,
      assignedVehicle: driver.assignedVehicle ? {
        id: driver.assignedVehicle.id,
        plateNumber: driver.assignedVehicle.plateNumber,
        model: driver.assignedVehicle.model,
        capacity: driver.assignedVehicle.capacity,
        status: driver.assignedVehicle.status
      } : null,
      tempCredentials: {
        otp: otp,
        otpExpiry: otpExpiry.toISOString(),
        email: body.email
      }
    };

    const duration = Date.now() - startTime;
    console.log(`✅ [DRIVERS_POST] Completed in ${duration}ms`);
    console.log('   └─ Driver created successfully with OTP');
    console.log('====================\n');

    return NextResponse.json(transformedDriver, { status: 201 });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`❌ [DRIVERS_POST] Error after ${duration}ms:`, error);
    console.error('   └─ Name:', error.name);
    console.error('   └─ Message:', error.message);
    console.error('   └─ Stack:', error.stack);
    console.error('====================\n');
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A driver with this license number already exists' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to create driver' },
      { status: 500 }
    );
  }
}

// ==================== PUT METHOD with enhanced logging ====================
export async function PUT(request: NextRequest) {
  const startTime = Date.now();
  console.log('\n🚀 [DRIVERS_PUT] ====================');
  console.log('📋 Method: PUT /api/admin/drivers');
  console.log('⏰ Time:', new Date().toISOString());

  try {
    // Step 1: Authentication
    console.log('🔑 Step 1: Verifying authentication...');
    const auth = await verifyAuth(request);
    if (!auth.authenticated) {
      console.log('❌ Authentication failed:', auth.error);
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    console.log('   └─ Authenticated:', auth.user?.email);

    // Step 2: Parse request body
    console.log('📦 Step 2: Parsing request body...');
    const body = await request.json();
    const { id, ...updateData } = body;

    console.log('   └─ Driver ID:', id);
    console.log('   └─ Update data:', updateData);

    if (!id) {
      console.log('❌ Missing driver ID');
      return NextResponse.json(
        { error: 'Driver ID is required' },
        { status: 400 }
      );
    }

    // Step 3: Map status if provided
    const statusMap: Record<string, DriverStatus> = {
      'active': 'ACTIVE',
      'off-duty': 'OFF_DUTY',
      'on-leave': 'ON_LEAVE',
      'suspended': 'SUSPENDED',
      'terminated': 'TERMINATED'
    };

    // Step 4: Update driver
    console.log('💾 Step 4: Updating driver...');
    const driver = await prisma.driver.update({
      where: { id },
      data: {
        ...(updateData.licenseNumber && { licenseNumber: updateData.licenseNumber }),
        ...(updateData.status && { status: statusMap[updateData.status.toLowerCase()] }),
        ...(updateData.vehicleId && {
          assignedVehicle: {
            connect: { id: updateData.vehicleId }
          }
        }),
        ...(updateData.vehicleId === null && {
          assignedVehicle: {
            disconnect: true
          }
        })
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
            avatar: true
          }
        },
        assignedVehicle: {
          select: {
            id: true,
            plateNumber: true,
            model: true,
            capacity: true,
            status: true
          }
        },
        performanceMetrics: {
          take: 1,
          orderBy: { date: 'desc' }
        }
      }
    });

    console.log('   └─ Driver updated successfully');

    const latestMetrics = driver.performanceMetrics[0] || null;

    // Step 5: Transform response
    const transformedDriver = {
      id: driver.id,
      userId: driver.userId,
      name: driver.user?.name,
      email: driver.user?.email,
      phone: driver.user?.phone,
      avatar: driver.user?.avatar,
      licenseNumber: driver.licenseNumber,
      status: driver.status.toLowerCase(),
      createdAt: driver.createdAt,
      rating: latestMetrics?.rating || null,
      tripsCompleted: latestMetrics?.tripsCount || 0,
      totalRevenue: latestMetrics?.totalIncome || 0,
      assignedVehicle: driver.assignedVehicle
    };

    const duration = Date.now() - startTime;
    console.log(`✅ [DRIVERS_PUT] Completed in ${duration}ms`);
    console.log('====================\n');

    return NextResponse.json(transformedDriver);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`❌ [DRIVERS_PUT] Error after ${duration}ms:`, error);
    console.error('   └─ Name:', error.name);
    console.error('   └─ Message:', error.message);
    console.error('====================\n');
    
    return NextResponse.json(
      { error: error.message || 'Failed to update driver' },
      { status: 500 }
    );
  }
}

// ==================== DELETE METHOD with enhanced logging ====================
export async function DELETE(request: NextRequest) {
  const startTime = Date.now();
  console.log('\n🚀 [DRIVERS_DELETE] ====================');
  console.log('📋 Method: DELETE /api/admin/drivers');
  console.log('⏰ Time:', new Date().toISOString());

  try {
    // Step 1: Authentication
    console.log('🔑 Step 1: Verifying authentication...');
    const auth = await verifyAuth(request);
    if (!auth.authenticated) {
      console.log('❌ Authentication failed:', auth.error);
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    console.log('   └─ Authenticated:', auth.user?.email);

    // Step 2: Get driver ID from query params
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    console.log('📋 Step 2: Driver ID:', id);

    if (!id) {
      console.log('❌ Missing driver ID');
      return NextResponse.json(
        { error: 'Driver ID is required' },
        { status: 400 }
      );
    }

    // Step 3: Find driver
    console.log('🔍 Step 3: Finding driver...');
    const driver = await prisma.driver.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!driver) {
      console.log('❌ Driver not found');
      return NextResponse.json(
        { error: 'Driver not found' },
        { status: 404 }
      );
    }
    console.log('   └─ Driver found:', driver.id);

    // Step 4: Delete from Prisma
    console.log('💾 Step 4: Deleting from Prisma...');
    await prisma.driver.delete({
      where: { id }
    });
    console.log('   └─ Prisma deletion successful');

    // Step 5: Delete from Firebase
    console.log('🔥 Step 5: Deleting from Firebase...');
    try {
      await admin.auth().deleteUser(driver.userId);
      console.log('   └─ Firebase deletion successful');
    } catch (firebaseError) {
      console.error('⚠️ Error deleting Firebase user:', firebaseError);
    }

    const duration = Date.now() - startTime;
    console.log(`✅ [DRIVERS_DELETE] Completed in ${duration}ms`);
    console.log('====================\n');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`❌ [DRIVERS_DELETE] Error after ${duration}ms:`, error);
    console.error('   └─ Name:', error.name);
    console.error('   └─ Message:', error.message);
    console.error('====================\n');
    
    return NextResponse.json(
      { error: error.message || 'Failed to delete driver' },
      { status: 500 }
    );
  }
}