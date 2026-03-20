import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { verifyDriverAuth } from '../../../../lib/firebase/admin';
import { writeFile, mkdir, unlink } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

export async function POST(request: NextRequest) {
  try {
    console.log('='.repeat(50));
    console.log('🚀 Driver Expense API Called');
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

    // Find the user and their driver profile
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
        { error: 'No vehicle assigned' },
        { status: 400 }
      );
    }

    const driver = dbUser.driver;
    const vehicle = dbUser.driver.assignedVehicle;

    console.log('✅ Driver found:', driver.id);
    console.log('✅ Vehicle found:', vehicle.id);

    // Check content type to determine how to parse the request
    const contentType = request.headers.get('content-type') || '';
    const isFormData = contentType.includes('multipart/form-data');
    
    let category: string;
    let amount: string;
    let description: string;
    let location: string | null = null;
    let odometer: string | null = null;
    let quantity: string | null = null;
    let receiptFile: File | null = null;

    if (isFormData) {
      // Parse as FormData
      console.log('\n📦 Parsing form data...');
      const formData = await request.formData();
      
      category = (formData.get('category') || formData.get('type')) as string;
      amount = formData.get('amount') as string;
      description = formData.get('description') as string;
      location = formData.get('location') as string | null;
      odometer = formData.get('odometer') as string | null;
      quantity = formData.get('quantity') as string | null;
      receiptFile = formData.get('receipt') as File | null;
    } else {
      // Parse as JSON
      console.log('\n📦 Parsing JSON data...');
      const jsonData = await request.json();
      
      category = jsonData.category || jsonData.type;
      amount = jsonData.amount?.toString();
      description = jsonData.description;
      location = jsonData.location || null;
      odometer = jsonData.odometer?.toString() || null;
      quantity = jsonData.quantity?.toString() || null;
      // receiptFile remains null for JSON requests
    }

    // Validate required fields
    if (!category || !amount || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: category, amount, description' },
        { status: 400 }
      );
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    // Validate category against enum
    const validCategories = ['FUEL', 'MAINTENANCE', 'REPAIRS', 'INSURANCE', 'PARKING', 'TOLLS', 'FINES', 'OTHER'];
    const categoryUpper = category.toUpperCase();
    
    if (!validCategories.includes(categoryUpper)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${validCategories.join(', ')}` },
        { status: 400 }
      );
    }

    // Handle receipt upload (only for form data with file)
    let receiptUrl: string | null = null;
    if (receiptFile) {
      try {
        console.log('📸 Processing receipt upload...');
        
        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
        if (!validTypes.includes(receiptFile.type)) {
          return NextResponse.json(
            { error: 'Invalid file type. Please upload JPEG, PNG, or PDF' },
            { status: 400 }
          );
        }

        // Validate file size (max 5MB)
        if (receiptFile.size > 5 * 1024 * 1024) {
          return NextResponse.json(
            { error: 'File too large. Maximum size is 5MB' },
            { status: 400 }
          );
        }

        // Create unique filename
        const timestamp = Date.now();
        const extension = receiptFile.name.split('.').pop();
        const filename = `receipt_${driver.id}_${timestamp}.${extension}`;
        
        // Ensure upload directory exists
        const uploadDir = path.join(process.cwd(), 'public/uploads/receipts');
        if (!existsSync(uploadDir)) {
          await mkdir(uploadDir, { recursive: true });
        }

        // Save file
        const bytes = await receiptFile.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const filePath = path.join(uploadDir, filename);
        await writeFile(filePath, buffer);
        
        receiptUrl = `/uploads/receipts/${filename}`;
        console.log('✅ Receipt saved:', receiptUrl);
      } catch (uploadError) {
        console.error('❌ Error uploading receipt:', uploadError);
        // Continue without receipt if upload fails
      }
    }

    // Create expense record with COMPLETED status
    console.log('\n💾 Creating expense record...');
    
    const expenseData: any = {
      vehicleId: vehicle.id,
      driverId: driver.id,
      amount: amountNum,
      category: categoryUpper,
      description: description,
      date: new Date(),
      approved: true, // Set to true for completed status
      receipt: receiptUrl,
    };

    const expense = await prisma.expense.create({
      data: expenseData,
      include: {
        driver: {
          select: {
            id: true,
            licenseNumber: true,
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
      }
    });

    console.log('✅ Expense created:', expense.id);

    // If this is a fuel expense and quantity was provided, create a fuel log
    if (categoryUpper === 'FUEL' && quantity) {
      try {
        const quantityNum = parseFloat(quantity);
        if (!isNaN(quantityNum) && quantityNum > 0) {
          console.log('⛽ Fuel quantity recorded:', quantityNum, 'liters');
        }
      } catch (fuelError) {
        console.error('Error processing fuel quantity:', fuelError);
        // Don't fail the whole request if fuel logging fails
      }
    }

    const response = {
      success: true,
      message: 'Expense recorded successfully',
      expense: {
        id: expense.id,
        amount: expense.amount,
        category: expense.category.toLowerCase(),
        description: expense.description,
        date: expense.date.toISOString(),
        status: 'completed', // Map approved to completed
        receipt: expense.receipt,
        location: location,
        driver: expense.driver ? {
          id: expense.driver.id,
          name: expense.driver.user?.name,
          licenseNumber: expense.driver.licenseNumber
        } : null,
        vehicle: expense.vehicle ? {
          plateNumber: expense.vehicle.plateNumber,
          model: expense.vehicle.model
        } : null
      }
    };

    console.log('✅ Response prepared:', response);
    console.log('='.repeat(50));

    return NextResponse.json(response, { status: 201 });

  } catch (error: any) {
    console.error('❌ Error creating expense:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { error: error.message || 'Failed to create expense' },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch expenses
export async function GET(request: NextRequest) {
  try {
    console.log('='.repeat(50));
    console.log('🚀 Driver Expenses GET API Called');
    console.log('='.repeat(50));
    
    // Verify Firebase authentication
    const auth = await verifyDriverAuth(request);
    
    if (!auth.authenticated) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const firebaseEmail = auth.user?.email;
    const firebaseUid = auth.user?.uid;

    // Find the driver
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

    if (!dbUser?.driver) {
      return NextResponse.json(
        { error: 'Driver not found' },
        { status: 404 }
      );
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const category = searchParams.get('category');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      driverId: dbUser.driver.id
    };

    if (category) {
      where.category = category.toUpperCase();
    }

    if (status) {
      if (status === 'completed') where.approved = true;
      else if (status === 'pending') where.approved = false;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        where.date.lte = new Date(endDate);
      }
    }

    // Fetch expenses with pagination
    const [expenses, totalCount] = await Promise.all([
      prisma.expense.findMany({
        where,
        orderBy: { date: 'desc' },
        skip,
        take: limit,
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
      }),
      prisma.expense.count({ where })
    ]);

    // Get summary statistics
    const summary = await prisma.expense.aggregate({
      where: {
        driverId: dbUser.driver.id
      },
      _sum: {
        amount: true
      },
      _avg: {
        amount: true
      },
      _count: true
    });

    // Get expenses by category
    const byCategory = await prisma.expense.groupBy({
      by: ['category'],
      where: {
        driverId: dbUser.driver.id
      },
      _sum: {
        amount: true
      },
      _count: true
    });

    // Get recent expenses (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentSummary = await prisma.expense.aggregate({
      where: {
        driverId: dbUser.driver.id,
        date: {
          gte: thirtyDaysAgo
        }
      },
      _sum: {
        amount: true
      },
      _count: true
    });

    const response = {
      expenses: expenses.map(exp => ({
        id: exp.id,
        amount: exp.amount,
        category: exp.category.toLowerCase(),
        description: exp.description,
        date: exp.date.toISOString(),
        status: exp.approved ? 'completed' : 'pending', // Map approved to completed
        receipt: exp.receipt,
        vehicle: exp.vehicle ? {
          plateNumber: exp.vehicle.plateNumber,
          model: exp.vehicle.model
        } : null,
        driverName: exp.driver?.user?.name
      })),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalItems: totalCount,
        itemsPerPage: limit,
        hasNext: page * limit < totalCount,
        hasPrev: page > 1
      },
      summary: {
        totalAmount: summary._sum.amount || 0,
        totalCount: summary._count,
        averageAmount: summary._avg.amount || 0,
        recent30Days: {
          amount: recentSummary._sum.amount || 0,
          count: recentSummary._count
        }
      },
      byCategory: byCategory.map(cat => ({
        category: cat.category.toLowerCase(),
        total: cat._sum.amount || 0,
        count: cat._count,
        average: cat._count > 0 ? (cat._sum.amount || 0) / cat._count : 0
      }))
    };

    console.log('✅ Response prepared with', expenses.length, 'expenses');
    console.log('='.repeat(50));

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('❌ Error fetching expenses:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch expenses' },
      { status: 500 }
    );
  }
}

// PUT endpoint to update an expense
export async function PUT(request: NextRequest) {
  try {
    console.log('='.repeat(50));
    console.log('🚀 Driver Expense UPDATE API Called');
    console.log('='.repeat(50));
    
    // Verify Firebase authentication
    const auth = await verifyDriverAuth(request);
    
    if (!auth.authenticated) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const firebaseEmail = auth.user?.email;
    const firebaseUid = auth.user?.uid;
    
    // Parse request body
    const body = await request.json();
    const { id, category, amount, description, date, location } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Expense ID is required' },
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

    // Check if expense exists and belongs to this driver
    const existingExpense = await prisma.expense.findFirst({
      where: {
        id,
        driverId: dbUser.driver.id
      }
    });

    if (!existingExpense) {
      return NextResponse.json(
        { error: 'Expense not found or unauthorized' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {};
    
    if (category) {
      const categoryUpper = category.toUpperCase();
      const validCategories = ['FUEL', 'MAINTENANCE', 'REPAIRS', 'INSURANCE', 'PARKING', 'TOLLS', 'FINES', 'OTHER'];
      if (!validCategories.includes(categoryUpper)) {
        return NextResponse.json(
          { error: `Invalid category. Must be one of: ${validCategories.join(', ')}` },
          { status: 400 }
        );
      }
      updateData.category = categoryUpper;
    }
    
    if (amount) {
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        return NextResponse.json(
          { error: 'Invalid amount' },
          { status: 400 }
        );
      }
      updateData.amount = amountNum;
    }
    
    if (description) updateData.description = description;
    if (date) updateData.date = new Date(date);
    
    // Always keep approved as true for completed status
    updateData.approved = true;

    // Update the expense
    const updatedExpense = await prisma.expense.update({
      where: { id },
      data: updateData,
      include: {
        vehicle: {
          select: {
            plateNumber: true,
            model: true
          }
        }
      }
    });

    console.log('✅ Expense updated:', updatedExpense.id);
    console.log('='.repeat(50));

    return NextResponse.json({
      success: true,
      message: 'Expense updated successfully',
      expense: {
        id: updatedExpense.id,
        amount: updatedExpense.amount,
        category: updatedExpense.category.toLowerCase(),
        description: updatedExpense.description,
        date: updatedExpense.date.toISOString(),
        status: 'completed', // Always completed after update
        location: location || null,
        vehicle: updatedExpense.vehicle ? {
          plateNumber: updatedExpense.vehicle.plateNumber,
          model: updatedExpense.vehicle.model
        } : null
      }
    });

  } catch (error: any) {
    console.error('❌ Error updating expense:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update expense' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to delete an expense
export async function DELETE(request: NextRequest) {
  try {
    console.log('='.repeat(50));
    console.log('🚀 Driver Expense DELETE API Called');
    console.log('='.repeat(50));
    
    // Verify Firebase authentication
    const auth = await verifyDriverAuth(request);
    
    if (!auth.authenticated) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const firebaseEmail = auth.user?.email;
    const firebaseUid = auth.user?.uid;
    const { searchParams } = new URL(request.url);
    const expenseId = searchParams.get('id');

    if (!expenseId) {
      return NextResponse.json(
        { error: 'Expense ID is required' },
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

    // Check if expense exists and belongs to this driver
    const expense = await prisma.expense.findFirst({
      where: {
        id: expenseId,
        driverId: dbUser.driver.id
      }
    });

    if (!expense) {
      return NextResponse.json(
        { error: 'Expense not found or unauthorized' },
        { status: 404 }
      );
    }

    // Delete receipt file if it exists
    if (expense.receipt) {
      try {
        const filePath = path.join(process.cwd(), 'public', expense.receipt);
        if (existsSync(filePath)) {
          await unlink(filePath);
          console.log('✅ Receipt file deleted:', filePath);
        }
      } catch (fileError) {
        console.error('Error deleting receipt file:', fileError);
      }
    }

    // Delete the expense
    await prisma.expense.delete({
      where: { id: expenseId }
    });

    console.log('✅ Expense deleted:', expenseId);
    console.log('='.repeat(50));

    return NextResponse.json({
      success: true,
      message: 'Expense deleted successfully'
    });

  } catch (error: any) {
    console.error('❌ Error deleting expense:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete expense' },
      { status: 500 }
    );
  }
}

// PATCH endpoint to partially update an expense (alternative to PUT)
export async function PATCH(request: NextRequest) {
  try {
    console.log('='.repeat(50));
    console.log('🚀 Driver Expense PATCH API Called');
    console.log('='.repeat(50));
    
    // Verify Firebase authentication
    const auth = await verifyDriverAuth(request);
    
    if (!auth.authenticated) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const firebaseEmail = auth.user?.email;
    const firebaseUid = auth.user?.uid;
    
    // Parse request body
    const body = await request.json();
    const { id, category, amount, description, date } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Expense ID is required' },
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

    // Check if expense exists and belongs to this driver
    const existingExpense = await prisma.expense.findFirst({
      where: {
        id,
        driverId: dbUser.driver.id
      }
    });

    if (!existingExpense) {
      return NextResponse.json(
        { error: 'Expense not found or unauthorized' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {};
    
    if (category) {
      const categoryUpper = category.toUpperCase();
      const validCategories = ['FUEL', 'MAINTENANCE', 'REPAIRS', 'INSURANCE', 'PARKING', 'TOLLS', 'FINES', 'OTHER'];
      if (!validCategories.includes(categoryUpper)) {
        return NextResponse.json(
          { error: `Invalid category. Must be one of: ${validCategories.join(', ')}` },
          { status: 400 }
        );
      }
      updateData.category = categoryUpper;
    }
    
    if (amount) {
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        return NextResponse.json(
          { error: 'Invalid amount' },
          { status: 400 }
        );
      }
      updateData.amount = amountNum;
    }
    
    if (description) updateData.description = description;
    if (date) updateData.date = new Date(date);
    
    // Always ensure approved is true for completed status
    if (Object.keys(updateData).length > 0) {
      updateData.approved = true;
    }

    // Update the expense
    const updatedExpense = await prisma.expense.update({
      where: { id },
      data: updateData,
      include: {
        vehicle: {
          select: {
            plateNumber: true,
            model: true
          }
        }
      }
    });

    console.log('✅ Expense patched:', updatedExpense.id);
    console.log('='.repeat(50));

    return NextResponse.json({
      success: true,
      message: 'Expense updated successfully',
      expense: {
        id: updatedExpense.id,
        amount: updatedExpense.amount,
        category: updatedExpense.category.toLowerCase(),
        description: updatedExpense.description,
        date: updatedExpense.date.toISOString(),
        status: 'completed', // Always completed
        vehicle: updatedExpense.vehicle ? {
          plateNumber: updatedExpense.vehicle.plateNumber,
          model: updatedExpense.vehicle.model
        } : null
      }
    });

  } catch (error: any) {
    console.error('❌ Error updating expense:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update expense' },
      { status: 500 }
    );
  }
}