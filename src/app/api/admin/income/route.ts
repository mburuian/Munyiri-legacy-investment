// app/api/admin/income/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { verifyAuth } from '../../../../lib/firebase/admin';
import { IncomeType } from '@prisma/client';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  console.log('\n💰 [INCOME_GET] ====================');
  console.log('📋 Method: GET /api/admin/income');
  console.log('⏰ Time:', new Date().toISOString());

  try {
    // Step 1: Authentication - Just verify the token
    console.log('🔑 Step 1: Verifying authentication...');
    const auth = await verifyAuth(request);
    console.log('   └─ Authenticated:', auth.authenticated);
    console.log('   └─ User email:', auth.user?.email || 'N/A');
    console.log('   └─ User role:', auth.user?.role || 'N/A');

    if (!auth.authenticated) {
      console.log('❌ Authentication failed:', auth.error);
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' }, 
        { status: auth.status || 401 }
      );
    }

    // ✅ NO DATABASE USER LOOKUP - Using auth.user directly
    console.log('   └─ Access granted for role:', auth.user?.role);

    // Step 2: Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const page = parseInt(searchParams.get('page') || '1');
    const type = searchParams.get('type');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const driverId = searchParams.get('driverId');
    const vehicleId = searchParams.get('vehicleId');

    console.log('📊 Step 2: Query parameters:', {
      limit,
      page,
      type,
      startDate,
      endDate,
      driverId,
      vehicleId
    });

    // Step 3: Build where clause
    console.log('🔨 Step 3: Building where clause...');
    const where: any = {};
    
    if (type) where.type = type;
    if (driverId) where.driverId = driverId;
    if (vehicleId) where.vehicleId = vehicleId;
    
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    // For non-admin users, only show their own income
    if (auth.user?.role !== 'ADMIN' && auth.user?.role !== 'FLEET_MANAGER') {
      console.log('⚠️ Non-admin access - filtering by driver');
      // This assumes you have a way to get driver ID from user email
      // You might need to create a driver profile lookup endpoint
      // where.driverId = ? 
    }

    // Step 4: Fetch income logs with pagination
    console.log('📦 Step 4: Fetching income logs from database...');
    const skip = (page - 1) * limit;
    
    const [incomeLogs, total] = await Promise.all([
      prisma.incomeLog.findMany({
        where,
        include: {
          driver: {
            include: { 
              user: { 
                select: { 
                  name: true, 
                  email: true 
                } 
              } 
            }
          },
          vehicle: { 
            select: { 
              id: true,
              plateNumber: true, 
              model: true 
            } 
          }
        },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      prisma.incomeLog.count({ where })
    ]);

    console.log(`   └─ Found ${incomeLogs.length} income logs (total: ${total})`);

    // Step 5: Get summary stats (only for admins)
    let summary = { total: 0, count: 0, byType: [] as { type: IncomeType; total: number; count: number; }[] };
    
    if (auth.user?.role === 'ADMIN' || auth.user?.role === 'FLEET_MANAGER') {
      console.log('📊 Step 5: Calculating summary statistics...');
      const [aggregate, typeGroup] = await Promise.all([
        prisma.incomeLog.aggregate({
          where,
          _sum: { amount: true },
          _count: true,
        }),
        prisma.incomeLog.groupBy({
          by: ['type'],
          where,
          _sum: { amount: true },
          _count: true,
        })
      ]);

      summary = {
        total: aggregate._sum.amount || 0,
        count: aggregate._count,
        byType: typeGroup.map(item => ({
          type: item.type,
          total: item._sum.amount || 0,
          count: item._count,
        })),
      };

      console.log('   └─ Total amount:', summary.total);
      console.log('   └─ Total count:', summary.count);
    }

    // Step 6: Transform response
    console.log('🔄 Step 6: Transforming response...');
    const transformedItems = incomeLogs.map(log => ({
      id: log.id,
      amount: log.amount,
      type: log.type,
      description: log.description,
      date: log.date,
      driver: log.driver ? {
        id: log.driver.id,
        name: log.driver.user?.name,
        email: log.driver.user?.email,
      } : null,
      vehicle: log.vehicle ? {
        id: log.vehicle.id,
        plateNumber: log.vehicle.plateNumber,
        model: log.vehicle.model,
      } : null,
      tripStart: log.tripStart,
      tripEnd: log.tripEnd,
      distanceKm: log.distanceKm,
    }));

    const duration = Date.now() - startTime;
    console.log(`✅ [INCOME_GET] Completed in ${duration}ms`);
    console.log('   └─ Items returned:', transformedItems.length);
    console.log('💰 ====================\n');

    return NextResponse.json({
      success: true,
      items: transformedItems,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
      summary,
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`❌ [INCOME_GET] Error after ${duration}ms:`, error);
    console.error('💰 ====================\n');

    return NextResponse.json(
      { 
        error: 'Failed to fetch income',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// ==================== POST METHOD ====================
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('\n💰 [INCOME_POST] ====================');
  console.log('📋 Method: POST /api/admin/income');
  console.log('⏰ Time:', new Date().toISOString());

  try {
    // Step 1: Authentication
    console.log('🔑 Step 1: Verifying authentication...');
    const auth = await verifyAuth(request);
    
    if (!auth.authenticated) {
      console.log('❌ Authentication failed');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Step 2: Check admin role using token
    console.log('👤 Step 2: Checking user role from token...');
    if (auth.user?.role !== 'ADMIN' && auth.user?.role !== 'FLEET_MANAGER') {
      console.log('❌ Forbidden - Insufficient permissions');
      return NextResponse.json(
        { error: 'Forbidden - Insufficient permissions' },
        { status: 403 }
      );
    }

    // Step 3: Parse request body
    console.log('📦 Step 3: Parsing request body...');
    const body = await request.json();
    console.log('   └─ Body:', {
      amount: body.amount,
      type: body.type,
      description: body.description,
      vehicleId: body.vehicleId,
      driverId: body.driverId || 'none',
      date: body.date || 'now'
    });

    // Step 4: Validate required fields
    console.log('✅ Step 4: Validating fields...');
    if (!body.amount || !body.type || !body.vehicleId) {
      console.log('❌ Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields: amount, type, vehicleId' },
        { status: 400 }
      );
    }

    // Step 5: Create income log
    console.log('💾 Step 5: Creating income log...');
    const incomeLog = await prisma.incomeLog.create({
      data: {
        amount: parseFloat(body.amount),
        type: body.type,
        description: body.description || '',
        date: body.date ? new Date(body.date) : new Date(),
        vehicleId: body.vehicleId,
        driverId: body.driverId || null,
        tripStart: body.tripStart ? new Date(body.tripStart) : null,
        tripEnd: body.tripEnd ? new Date(body.tripEnd) : null,
        distanceKm: body.distanceKm ? parseFloat(body.distanceKm) : null,
        startOdometer: body.startOdometer ? parseInt(body.startOdometer) : null,
        endOdometer: body.endOdometer ? parseInt(body.endOdometer) : null,
      },
      include: {
        driver: {
          include: {
            user: {
              select: { name: true, email: true }
            }
          }
        },
        vehicle: {
          select: { 
            id: true,
            plateNumber: true, 
            model: true 
          }
        }
      }
    });

    console.log('   └─ Income log created with ID:', incomeLog.id);

    const duration = Date.now() - startTime;
    console.log(`✅ [INCOME_POST] Completed in ${duration}ms`);
    console.log('💰 ====================\n');

    return NextResponse.json({
      success: true,
      item: incomeLog
    }, { status: 201 });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`❌ [INCOME_POST] Error after ${duration}ms:`, error);
    console.error('💰 ====================\n');

    return NextResponse.json(
      { error: 'Failed to create income log' },
      { status: 500 }
    );
  }
}

// ==================== PUT METHOD ====================
export async function PUT(request: NextRequest) {
  const startTime = Date.now();
  console.log('\n💰 [INCOME_PUT] ====================');
  console.log('📋 Method: PUT /api/admin/income');
  console.log('⏰ Time:', new Date().toISOString());

  try {
    // Authentication
    const auth = await verifyAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role using token
    if (auth.user?.role !== 'ADMIN' && auth.user?.role !== 'FLEET_MANAGER') {
      return NextResponse.json(
        { error: 'Forbidden - Insufficient permissions' },
        { status: 403 }
      );
    }

    // Parse and validate
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Income log ID is required' },
        { status: 400 }
      );
    }

    console.log('📋 Updating income log:', id);

    // Update income log
    const incomeLog = await prisma.incomeLog.update({
      where: { id },
      data: {
        ...(updateData.amount && { amount: parseFloat(updateData.amount) }),
        ...(updateData.type && { type: updateData.type }),
        ...(updateData.description && { description: updateData.description }),
        ...(updateData.date && { date: new Date(updateData.date) }),
        ...(updateData.vehicleId && { vehicleId: updateData.vehicleId }),
        ...(updateData.driverId && { driverId: updateData.driverId }),
        ...(updateData.distanceKm && { distanceKm: parseFloat(updateData.distanceKm) }),
      },
      include: {
        driver: {
          include: {
            user: {
              select: { name: true, email: true }
            }
          }
        },
        vehicle: {
          select: { 
            id: true,
            plateNumber: true, 
            model: true 
          }
        }
      }
    });

    const duration = Date.now() - startTime;
    console.log(`✅ [INCOME_PUT] Completed in ${duration}ms`);
    console.log('💰 ====================\n');

    return NextResponse.json({
      success: true,
      item: incomeLog
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`❌ [INCOME_PUT] Error after ${duration}ms:`, error);
    console.error('💰 ====================\n');

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Income log not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update income log' },
      { status: 500 }
    );
  }
}

// ==================== DELETE METHOD ====================
export async function DELETE(request: NextRequest) {
  const startTime = Date.now();
  console.log('\n💰 [INCOME_DELETE] ====================');
  console.log('📋 Method: DELETE /api/admin/income');
  console.log('⏰ Time:', new Date().toISOString());

  try {
    // Authentication
    const auth = await verifyAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can delete
    if (auth.user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Get ID from query params
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Income log ID is required' },
        { status: 400 }
      );
    }

    console.log('📋 Deleting income log:', id);

    // Delete income log
    await prisma.incomeLog.delete({
      where: { id }
    });

    const duration = Date.now() - startTime;
    console.log(`✅ [INCOME_DELETE] Completed in ${duration}ms`);
    console.log('💰 ====================\n');

    return NextResponse.json({
      success: true,
      message: 'Income log deleted successfully'
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`❌ [INCOME_DELETE] Error after ${duration}ms:`, error);
    console.error('💰 ====================\n');

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Income log not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete income log' },
      { status: 500 }
    );
  }
}