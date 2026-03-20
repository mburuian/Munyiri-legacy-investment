// app/api/admin/alerts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { verifyAuth } from '../../../../lib/firebase/admin';

export async function GET(request: NextRequest) {
  try {
    console.log('⚠️ [ALERTS_GET] Starting...');
    
    const auth = await verifyAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' }, 
        { status: auth.status || 401 }
      );
    }

    console.log('✅ User authenticated:', { 
      email: auth.user?.email, 
      role: auth.user?.role 
    });

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const resolved = searchParams.get('resolved');
    const severity = searchParams.get('severity');
    const type = searchParams.get('type');
    const vehicleId = searchParams.get('vehicleId');
    const driverId = searchParams.get('driverId');

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    // Filter by resolved status if provided
    if (resolved !== null && resolved !== undefined) {
      where.resolved = resolved === 'true';
    }

    if (severity && severity !== 'all') {
      where.severity = severity.toUpperCase();
    }

    if (type && type !== 'all') {
      where.type = type.toUpperCase();
    }

    // For non-admin users, only show their own alerts
    // Note: You'll need to implement driver profile lookup to get driverId from user email
    if (auth.user?.role !== 'ADMIN' && auth.user?.role !== 'FLEET_MANAGER') {
      console.log('⚠️ Non-admin access - filtering by driver');
      // This assumes you have a way to get driver ID from user email
      // You'll need to implement this based on your data model
      // where.driverId = ? 
    } else {
      // Admins can filter by vehicle/driver
      if (vehicleId) {
        where.vehicleId = vehicleId;
      }
      if (driverId) {
        where.driverId = driverId;
      }
    }

    console.log('🔍 Fetching alerts with where:', where);

    // Get alerts with pagination
    const [alerts, total] = await Promise.all([
      prisma.alert.findMany({
        where,
        include: {
          vehicle: {
            select: {
              id: true,
              plateNumber: true,
              model: true,
              status: true
            }
          },
          driver: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                  phone: true
                }
              }
            }
          }
        },
        orderBy: [
          { severity: 'desc' },
          { createdAt: 'desc' }
        ],
        skip,
        take: limit
      }),
      prisma.alert.count({ where })
    ]);

    // Get summary statistics (only for admins)
    let summary = {
      total: 0,
      unresolved: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      byType: {} as Record<string, number>
    };

    if (auth.user?.role === 'ADMIN' || auth.user?.role === 'FLEET_MANAGER') {
      const [totalCount, unresolvedCount, criticalCount, highCount, mediumCount, lowCount] = await Promise.all([
        prisma.alert.count(),
        prisma.alert.count({ where: { resolved: false } }),
        prisma.alert.count({ where: { severity: 'CRITICAL', resolved: false } }),
        prisma.alert.count({ where: { severity: 'HIGH', resolved: false } }),
        prisma.alert.count({ where: { severity: 'MEDIUM', resolved: false } }),
        prisma.alert.count({ where: { severity: 'LOW', resolved: false } })
      ]);

      // Get counts by type
      const insuranceCount = await prisma.alert.count({ where: { type: 'INSURANCE', resolved: false } });
      const maintenanceCount = await prisma.alert.count({ where: { type: 'MAINTENANCE', resolved: false } });
      const complianceCount = await prisma.alert.count({ where: { type: 'COMPLIANCE', resolved: false } });
      const driverCount = await prisma.alert.count({ where: { type: 'DRIVER', resolved: false } });
      const vehicleCount = await prisma.alert.count({ where: { type: 'VEHICLE', resolved: false } });
      const financialCount = await prisma.alert.count({ where: { type: 'FINANCIAL', resolved: false } });

      summary = {
        total: totalCount,
        unresolved: unresolvedCount,
        critical: criticalCount,
        high: highCount,
        medium: mediumCount,
        low: lowCount,
        byType: {
          insurance: insuranceCount,
          maintenance: maintenanceCount,
          compliance: complianceCount,
          driver: driverCount,
          vehicle: vehicleCount,
          financial: financialCount
        }
      };
    }

    // Format alerts for frontend
    const formattedAlerts = alerts.map(alert => ({
      id: alert.id,
      vehicle: alert.vehicle ? {
        id: alert.vehicle.id,
        plateNumber: alert.vehicle.plateNumber,
        model: alert.vehicle.model,
        status: alert.vehicle.status
      } : null,
      driver: alert.driver ? {
        id: alert.driver.id,
        name: alert.driver.user?.name || 'Unknown',
        email: alert.driver.user?.email,
        phone: alert.driver.user?.phone,
        licenseNumber: alert.driver.licenseNumber
      } : null,
      type: alert.type.toLowerCase(),
      severity: alert.severity.toLowerCase(),
      title: alert.title,
      description: alert.description,
      dueDate: alert.dueDate?.toISOString() || null,
      resolved: alert.resolved,
      resolvedAt: alert.resolvedAt?.toISOString() || null,
      resolvedBy: alert.resolvedBy || null,
      createdAt: alert.createdAt.toISOString()
    }));

    console.log('✅ Success:', { alertsCount: alerts.length, total });

    return NextResponse.json({
      success: true,
      items: formattedAlerts,
      summary,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error: any) {
    console.error('❌ Error fetching alerts:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch alerts',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('⚠️ [ALERTS_POST] Creating new alert');
    
    const auth = await verifyAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' }, 
        { status: auth.status || 401 }
      );
    }

    console.log('✅ User authenticated:', { 
      email: auth.user?.email, 
      role: auth.user?.role 
    });

    // Only admins and fleet managers can create alerts
    if (auth.user?.role !== 'ADMIN' && auth.user?.role !== 'FLEET_MANAGER') {
      return NextResponse.json(
        { error: 'Forbidden - Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.title || !body.description || !body.type || !body.severity) {
      return NextResponse.json(
        { error: 'Missing required fields: title, description, type, severity' },
        { status: 400 }
      );
    }

    // Create alert
    const alert = await prisma.alert.create({
      data: {
        type: body.type.toUpperCase(),
        severity: body.severity.toUpperCase(),
        title: body.title,
        description: body.description,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        vehicleId: body.vehicleId || null,
        driverId: body.driverId || null,
        resolved: false
      },
      include: {
        vehicle: {
          select: {
            id: true,
            plateNumber: true,
            model: true
          }
        },
        driver: {
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
      }
    });

    console.log('✅ Alert created:', alert.id);

    // Format response
    const formattedAlert = {
      id: alert.id,
      vehicle: alert.vehicle ? {
        id: alert.vehicle.id,
        plateNumber: alert.vehicle.plateNumber,
        model: alert.vehicle.model
      } : null,
      driver: alert.driver ? {
        id: alert.driver.id,
        name: alert.driver.user?.name || 'Unknown',
        email: alert.driver.user?.email
      } : null,
      type: alert.type.toLowerCase(),
      severity: alert.severity.toLowerCase(),
      title: alert.title,
      description: alert.description,
      dueDate: alert.dueDate?.toISOString() || null,
      resolved: alert.resolved,
      createdAt: alert.createdAt.toISOString()
    };

    return NextResponse.json({ 
      success: true, 
      item: formattedAlert 
    }, { status: 201 });

  } catch (error: any) {
    console.error('❌ Error creating alert:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create alert',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    console.log('⚠️ [ALERTS_PUT] Updating alert');
    
    const auth = await verifyAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' }, 
        { status: auth.status || 401 }
      );
    }

    // Only admins and fleet managers can update alerts
    if (auth.user?.role !== 'ADMIN' && auth.user?.role !== 'FLEET_MANAGER') {
      return NextResponse.json(
        { error: 'Forbidden - Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Alert ID is required' },
        { status: 400 }
      );
    }

    // Prepare update data
    const data: any = {};
    
    if (updateData.type) data.type = updateData.type.toUpperCase();
    if (updateData.severity) data.severity = updateData.severity.toUpperCase();
    if (updateData.title) data.title = updateData.title;
    if (updateData.description) data.description = updateData.description;
    if (updateData.dueDate) data.dueDate = new Date(updateData.dueDate);
    if (updateData.vehicleId !== undefined) data.vehicleId = updateData.vehicleId;
    if (updateData.driverId !== undefined) data.driverId = updateData.driverId;
    
    // Handle resolution
    if (updateData.resolved === true) {
      data.resolved = true;
      data.resolvedAt = new Date();
      data.resolvedBy = auth.user?.email || 'system';
    } else if (updateData.resolved === false) {
      data.resolved = false;
      data.resolvedAt = null;
      data.resolvedBy = null;
    }

    const alert = await prisma.alert.update({
      where: { id },
      data,
      include: {
        vehicle: {
          select: {
            id: true,
            plateNumber: true,
            model: true
          }
        },
        driver: {
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
      }
    });

    console.log('✅ Alert updated:', alert.id);

    // Format response
    const formattedAlert = {
      id: alert.id,
      vehicle: alert.vehicle ? {
        id: alert.vehicle.id,
        plateNumber: alert.vehicle.plateNumber,
        model: alert.vehicle.model
      } : null,
      driver: alert.driver ? {
        id: alert.driver.id,
        name: alert.driver.user?.name || 'Unknown',
        email: alert.driver.user?.email
      } : null,
      type: alert.type.toLowerCase(),
      severity: alert.severity.toLowerCase(),
      title: alert.title,
      description: alert.description,
      dueDate: alert.dueDate?.toISOString() || null,
      resolved: alert.resolved,
      resolvedAt: alert.resolvedAt?.toISOString() || null,
      resolvedBy: alert.resolvedBy || null,
      createdAt: alert.createdAt.toISOString()
    };

    return NextResponse.json({
      success: true,
      item: formattedAlert
    });

  } catch (error: any) {
    console.error('❌ Error updating alert:', error);
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Alert not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Failed to update alert',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    console.log('⚠️ [ALERTS_PATCH] Quick update');
    
    const auth = await verifyAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' }, 
        { status: auth.status || 401 }
      );
    }

    // Only admins and fleet managers can patch alerts
    if (auth.user?.role !== 'ADMIN' && auth.user?.role !== 'FLEET_MANAGER') {
      return NextResponse.json(
        { error: 'Forbidden - Insufficient permissions' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const action = searchParams.get('action');

    if (!id) {
      return NextResponse.json(
        { error: 'Alert ID is required' },
        { status: 400 }
      );
    }

    let alert;

    if (action === 'resolve') {
      // Resolve alert
      alert = await prisma.alert.update({
        where: { id },
        data: {
          resolved: true,
          resolvedAt: new Date(),
          resolvedBy: auth.user?.email || 'system'
        }
      });
    } else if (action === 'unresolve') {
      // Unresolve alert
      alert = await prisma.alert.update({
        where: { id },
        data: {
          resolved: false,
          resolvedAt: null,
          resolvedBy: null
        }
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "resolve" or "unresolve"' },
        { status: 400 }
      );
    }

    console.log('✅ Alert updated:', { id, action });

    return NextResponse.json({ 
      success: true, 
      item: {
        id: alert.id,
        resolved: alert.resolved,
        resolvedAt: alert.resolvedAt,
        resolvedBy: alert.resolvedBy
      }
    });

  } catch (error: any) {
    console.error('❌ Error updating alert:', error);
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Alert not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Failed to update alert',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    console.log('⚠️ [ALERTS_DELETE] Deleting alert');
    
    const auth = await verifyAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' }, 
        { status: auth.status || 401 }
      );
    }

    // Only admins can delete alerts
    if (auth.user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Alert ID is required' },
        { status: 400 }
      );
    }

    await prisma.alert.delete({
      where: { id }
    });

    console.log('✅ Alert deleted:', id);

    return NextResponse.json({ 
      success: true,
      message: 'Alert deleted successfully' 
    });

  } catch (error: any) {
    console.error('❌ Error deleting alert:', error);
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Alert not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Failed to delete alert',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}