// app/api/admin/expenses/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { verifyAuth } from '../../../../lib/firebase/admin';
import { ExpenseCategory } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    console.log('💰 [EXPENSES_GET] Starting authentication');
    
    const auth = await verifyAuth(request);
    console.log('📋 Auth result:', { 
      authenticated: auth.authenticated, 
      email: auth.user?.email,
      role: auth.user?.role
    });

    if (!auth.authenticated) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' }, 
        { status: auth.status || 401 }
      );
    }

    // ✅ NO DATABASE USER LOOKUP - Using auth.user directly
    console.log('✅ User authenticated:', { 
      email: auth.user?.email, 
      role: auth.user?.role 
    });

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const page = parseInt(searchParams.get('page') || '1');
    const category = searchParams.get('category');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const driverId = searchParams.get('driverId');
    const vehicleId = searchParams.get('vehicleId');
    const approved = searchParams.get('approved');

    // Build where clause
    const where: any = {};
    
    if (category) where.category = category;
    if (driverId) where.driverId = driverId;
    if (vehicleId) where.vehicleId = vehicleId;
    if (approved !== null) where.approved = approved === 'true';
    
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    // For non-admin users, only show their own expenses
    if (auth.user?.role !== 'ADMIN' && auth.user?.role !== 'FLEET_MANAGER') {
      console.log('⚠️ Non-admin access - filtering by driver');
      // This assumes you have a way to get driver ID from user email
      // You'll need to implement this based on your data model
      // where.driverId = ? 
    }

    console.log('🔍 Fetching with filters:', { limit, page, where });

    // Fetch expenses with pagination
    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
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
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.expense.count({ where })
    ]);

    // Get summary stats (only for admins/managers)
    let summary = { total: 0, count: 0, byCategory: [] as { category: ExpenseCategory; total: number; count: number; }[] };
    
    if (auth.user?.role === 'ADMIN' || auth.user?.role === 'FLEET_MANAGER') {
      const [aggregate, categoryGroup] = await Promise.all([
        prisma.expense.aggregate({
          where,
          _sum: { amount: true },
          _count: true,
        }),
        prisma.expense.groupBy({
          by: ['category'],
          where,
          _sum: { amount: true },
          _count: true,
        })
      ]);

      summary = {
        total: aggregate._sum.amount || 0,
        count: aggregate._count,
        byCategory: categoryGroup.map(item => ({
          category: item.category,
          total: item._sum.amount || 0,
          count: item._count,
        })),
      };
    }

    console.log('✅ Success:', { 
      expensesCount: expenses.length, 
      total,
      summaryTotal: summary.total 
    });

    return NextResponse.json({
      success: true,
      items: expenses.map(expense => ({
        id: expense.id,
        amount: expense.amount,
        category: expense.category,
        description: expense.description,
        date: expense.date,
        approved: expense.approved,
        driver: expense.driver ? {
          id: expense.driver.id,
          name: expense.driver.user?.name,
          email: expense.driver.user?.email,
        } : null,
        vehicle: expense.vehicle ? {
          id: expense.vehicle.id,
          plateNumber: expense.vehicle.plateNumber,
          model: expense.vehicle.model,
        } : null,
        receipt: expense.receipt,
      })),
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
      summary,
    });

  } catch (error: any) {
    console.error('❌ Error fetching expenses:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch expenses',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// ==================== POST METHOD ====================
export async function POST(request: NextRequest) {
  try {
    console.log('💰 [EXPENSES_POST] Creating new expense');
    
    const auth = await verifyAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' }, 
        { status: auth.status || 401 }
      );
    }

    // ✅ NO DATABASE USER LOOKUP - Using auth.user directly
    console.log('✅ User authenticated:', { email: auth.user?.email, role: auth.user?.role });

    // Check if user has permission to create expense
    if (auth.user?.role !== 'ADMIN' && auth.user?.role !== 'FLEET_MANAGER') {
      return NextResponse.json(
        { error: 'Forbidden - Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    // Validate required fields
    if (!body.amount || !body.category || !body.description || !body.vehicleId) {
      return NextResponse.json(
        { error: 'Missing required fields: amount, category, description, vehicleId' },
        { status: 400 }
      );
    }

    // Create expense
    const expense = await prisma.expense.create({
      data: {
        amount: parseFloat(body.amount),
        category: body.category,
        description: body.description,
        date: body.date ? new Date(body.date) : new Date(),
        vehicleId: body.vehicleId,
        driverId: body.driverId || null,
        receipt: body.receipt || null,
        approved: body.approved || false,
        approvedBy: body.approved ? auth.user?.email : null, // Use email from token
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

    console.log('✅ Expense created:', expense.id);

    return NextResponse.json({ 
      success: true, 
      item: expense 
    }, { status: 201 });

  } catch (error: any) {
    console.error('❌ Error creating expense:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create expense',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// ==================== PUT METHOD ====================
export async function PUT(request: NextRequest) {
  try {
    console.log('💰 [EXPENSES_PUT] Updating expense');
    
    const auth = await verifyAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    // Only admins and fleet managers can update expenses
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
        { error: 'Expense ID is required' },
        { status: 400 }
      );
    }

    // Update expense
    const expense = await prisma.expense.update({
      where: { id },
      data: {
        ...(updateData.amount && { amount: parseFloat(updateData.amount) }),
        ...(updateData.category && { category: updateData.category }),
        ...(updateData.description && { description: updateData.description }),
        ...(updateData.date && { date: new Date(updateData.date) }),
        ...(updateData.vehicleId && { vehicleId: updateData.vehicleId }),
        ...(updateData.driverId && { driverId: updateData.driverId }),
        ...(updateData.approved !== undefined && { 
          approved: updateData.approved,
          approvedBy: updateData.approved ? auth.user?.email : null
        }),
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

    console.log('✅ Expense updated:', expense.id);

    return NextResponse.json({
      success: true,
      item: expense
    });

  } catch (error: any) {
    console.error('❌ Error updating expense:', error);
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Failed to update expense',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// ==================== DELETE METHOD ====================
export async function DELETE(request: NextRequest) {
  try {
    console.log('💰 [EXPENSES_DELETE] Deleting expense');
    
    const auth = await verifyAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    // Only admins can delete expenses
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
        { error: 'Expense ID is required' },
        { status: 400 }
      );
    }

    // Delete expense
    await prisma.expense.delete({
      where: { id }
    });

    console.log('✅ Expense deleted:', id);

    return NextResponse.json({
      success: true,
      message: 'Expense deleted successfully'
    });

  } catch (error: any) {
    console.error('❌ Error deleting expense:', error);
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Failed to delete expense',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}