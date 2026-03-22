// app/api/admin/reports/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { verifyAuth } from '../../../../lib/firebase/admin';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const vehicleId = searchParams.get('vehicleId');
    const driverId = searchParams.get('driverId');
    const type = searchParams.get('type') || 'full';

    // Parse dates
    const startDate = startDateParam ? new Date(startDateParam) : null;
    const endDate = endDateParam ? new Date(endDateParam) : null;

    // Date filters for queries
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = startDate;
    }
    if (endDate) {
      dateFilter.lte = endDate;
    }

    // Build where conditions with proper null handling
    const incomeWhere: any = {};
    if (Object.keys(dateFilter).length) {
      incomeWhere.date = dateFilter;
    }
    if (vehicleId && vehicleId !== 'all') {
      incomeWhere.vehicleId = vehicleId;
    }
    if (driverId && driverId !== 'all') {
      incomeWhere.driverId = driverId;
    }

    const expenseWhere: any = {};
    if (Object.keys(dateFilter).length) {
      expenseWhere.date = dateFilter;
    }
    if (vehicleId && vehicleId !== 'all') {
      expenseWhere.vehicleId = vehicleId;
    }
    if (driverId && driverId !== 'all') {
      expenseWhere.driverId = driverId;
    }

    const tripWhere: any = {
      status: 'COMPLETED'
    };
    if (Object.keys(dateFilter).length) {
      tripWhere.startTime = dateFilter;
    }
    if (vehicleId && vehicleId !== 'all') {
      tripWhere.vehicleId = vehicleId;
    }
    if (driverId && driverId !== 'all') {
      tripWhere.driverId = driverId;
    }

    const vehicleWhere: any = {};
    if (vehicleId && vehicleId !== 'all') {
      vehicleWhere.id = vehicleId;
    }

    const driverWhere: any = {};
    if (driverId && driverId !== 'all') {
      driverWhere.id = driverId;
    }

    const maintenanceWhere: any = {};
    if (Object.keys(dateFilter).length) {
      maintenanceWhere.date = dateFilter;
    }
    if (vehicleId && vehicleId !== 'all') {
      maintenanceWhere.vehicleId = vehicleId;
    }

    // Fetch all required data based on report type
    const [
      incomeLogs,
      expenses,
      trips,
      vehicles,
      drivers,
      maintenanceRecords
    ] = await Promise.all([
      // Income logs
      prisma.incomeLog.findMany({
        where: incomeWhere,
        include: {
          vehicle: true,
          driver: {
            include: {
              user: true
            }
          }
        },
        orderBy: { date: 'desc' }
      }),
      // Expenses
      prisma.expense.findMany({
        where: expenseWhere,
        include: {
          vehicle: true,
          driver: {
            include: {
              user: true
            }
          }
        },
        orderBy: { date: 'desc' }
      }),
      // Trips
      prisma.trip.findMany({
        where: tripWhere,
        include: {
          vehicle: true,
          driver: {
            include: {
              user: true
            }
          }
        }
      }),
      // Vehicles
      prisma.vehicle.findMany({
        where: vehicleWhere,
        include: {
          driver: {
            include: {
              user: true
            }
          },
          images: {
            where: { isPrimary: true },
            take: 1
          }
        }
      }),
      // Drivers
      prisma.driver.findMany({
        where: driverWhere,
        include: {
          user: true,
          assignedVehicle: true
        }
      }),
      // Maintenance records
      prisma.maintenance.findMany({
        where: maintenanceWhere,
        include: {
          vehicle: true
        }
      })
    ]);

    // Calculate summary statistics
    const totalIncome = incomeLogs.reduce((sum, log) => sum + log.amount, 0);
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const netProfit = totalIncome - totalExpenses;
    const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;
    const totalTrips = trips.length;
    const totalDistance = trips.reduce((sum, trip) => sum + (trip.distanceKm || 0), 0);
    const averageFarePerTrip = totalTrips > 0 ? totalIncome / totalTrips : 0;
    const averageIncomePerKm = totalDistance > 0 ? totalIncome / totalDistance : 0;
    const activeVehicles = vehicles.filter(v => v.status === 'ACTIVE').length;
    const activeDrivers = drivers.filter(d => d.status === 'ACTIVE').length;
    const completionRate = trips.length > 0 ? 100 : 0; // This would need more logic based on started vs completed trips

    // Income by vehicle
    const incomeByVehicle = vehicles.map(vehicle => {
      const vehicleIncome = incomeLogs
        .filter(log => log.vehicleId === vehicle.id)
        .reduce((sum, log) => sum + log.amount, 0);
      const vehicleTrips = trips.filter(t => t.vehicleId === vehicle.id).length;
      const vehicleDistance = trips
        .filter(t => t.vehicleId === vehicle.id)
        .reduce((sum, t) => sum + (t.distanceKm || 0), 0);
      
      return {
        vehicleId: vehicle.id,
        plateNumber: vehicle.plateNumber,
        model: vehicle.model,
        totalIncome: vehicleIncome,
        totalTrips: vehicleTrips,
        totalDistance: vehicleDistance,
        avgPerTrip: vehicleTrips > 0 ? vehicleIncome / vehicleTrips : 0,
        avgPerKm: vehicleDistance > 0 ? vehicleIncome / vehicleDistance : 0,
        contribution: totalIncome > 0 ? (vehicleIncome / totalIncome) * 100 : 0
      };
    }).sort((a, b) => b.totalIncome - a.totalIncome);

    // Expenses by vehicle
    const expensesByVehicle = vehicles.map(vehicle => {
      const vehicleExpenses = expenses
        .filter(exp => exp.vehicleId === vehicle.id)
        .reduce((sum, exp) => sum + exp.amount, 0);
      
      const expenseCategories = expenses
        .filter(exp => exp.vehicleId === vehicle.id)
        .reduce((acc, exp) => {
          const existing = acc.find(c => c.category === exp.category);
          if (existing) {
            existing.amount += exp.amount;
            existing.count++;
          } else {
            acc.push({
              category: exp.category,
              amount: exp.amount,
              count: 1
            });
          }
          return acc;
        }, [] as Array<{ category: string; amount: number; count: number }>);
      
      return {
        vehicleId: vehicle.id,
        plateNumber: vehicle.plateNumber,
        model: vehicle.model,
        totalExpenses: vehicleExpenses,
        expenseCount: vehicleExpenses > 0 ? expenses.filter(e => e.vehicleId === vehicle.id).length : 0,
        categories: expenseCategories
      };
    }).sort((a, b) => b.totalExpenses - a.totalExpenses);

    // Income by driver
    const incomeByDriver = drivers.map(driver => {
      const driverIncome = incomeLogs
        .filter(log => log.driverId === driver.id)
        .reduce((sum, log) => sum + log.amount, 0);
      const driverTrips = trips.filter(t => t.driverId === driver.id).length;
      const driverDistance = trips
        .filter(t => t.driverId === driver.id)
        .reduce((sum, t) => sum + (t.distanceKm || 0), 0);
      
      // Get average rating from performance metrics (if available)
      let avgRating = 0;
      // This would come from your performance metrics table
      // For now, we'll use a placeholder or calculate from available data
      
      return {
        driverId: driver.id,
        name: driver.user.name || driver.user.email,
        email: driver.user.email,
        totalIncome: driverIncome,
        totalTrips: driverTrips,
        totalDistance: driverDistance,
        avgRating: avgRating
      };
    }).sort((a, b) => b.totalIncome - a.totalIncome);

    // Monthly trends
    const monthlyTrends = [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    for (let i = 0; i < 12; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      const monthIncome = incomeLogs
        .filter(log => {
          const logDate = new Date(log.date);
          return logDate >= monthStart && logDate <= monthEnd;
        })
        .reduce((sum, log) => sum + log.amount, 0);
      
      const monthExpenses = expenses
        .filter(exp => {
          const expDate = new Date(exp.date);
          return expDate >= monthStart && expDate <= monthEnd;
        })
        .reduce((sum, exp) => sum + exp.amount, 0);
      
      const monthTrips = trips
        .filter(trip => {
          const tripDate = new Date(trip.startTime);
          return tripDate >= monthStart && tripDate <= monthEnd;
        })
        .length;
      
      monthlyTrends.push({
        month: `${months[date.getMonth()]} ${date.getFullYear()}`,
        income: monthIncome,
        expenses: monthExpenses,
        profit: monthIncome - monthExpenses,
        trips: monthTrips
      });
    }
    
    monthlyTrends.reverse();

    // Top performing vehicles
    const topVehicles = [...incomeByVehicle]
      .sort((a, b) => b.totalIncome - a.totalIncome)
      .slice(0, 5)
      .map(vehicle => ({
        plateNumber: vehicle.plateNumber,
        totalIncome: vehicle.totalIncome,
        totalTrips: vehicle.totalTrips,
        efficiency: vehicle.avgPerKm > 0 ? (vehicle.avgPerKm * 100) : 0
      }));

    // Recent transactions
    const recentTransactions = [
      ...incomeLogs.slice(0, 10).map(log => ({
        id: log.id,
        date: log.date.toISOString(),
        type: 'income',
        amount: log.amount,
        vehicle: log.vehicle?.plateNumber || 'N/A',
        driver: log.driver?.user?.name || 'N/A',
        description: log.description || 'Income transaction'
      })),
      ...expenses.slice(0, 10).map(exp => ({
        id: exp.id,
        date: exp.date.toISOString(),
        type: 'expense',
        amount: exp.amount,
        vehicle: exp.vehicle?.plateNumber || 'N/A',
        driver: exp.driver?.user?.name || 'N/A',
        description: exp.description
      }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
     .slice(0, 20);

    // Build response based on report type
    let reportData: any = {
      summary: {
        totalIncome,
        totalExpenses,
        netProfit,
        profitMargin,
        totalTrips,
        totalDistance,
        averageFarePerTrip,
        averageIncomePerKm,
        activeVehicles,
        activeDrivers,
        completionRate
      },
      incomeByVehicle,
      expensesByVehicle,
      incomeByDriver,
      monthlyTrends,
      topVehicles,
      recentTransactions
    };

    // Filter based on report type
    if (type === 'income') {
      reportData = {
        summary: reportData.summary,
        incomeByVehicle,
        incomeByDriver,
        monthlyTrends: monthlyTrends.map(t => ({ month: t.month, income: t.income, trips: t.trips })),
        recentTransactions: recentTransactions.filter(t => t.type === 'income')
      };
    } else if (type === 'expenses') {
      reportData = {
        summary: reportData.summary,
        expensesByVehicle,
        monthlyTrends: monthlyTrends.map(t => ({ month: t.month, expenses: t.expenses })),
        recentTransactions: recentTransactions.filter(t => t.type === 'expense')
      };
    } else if (type === 'vehicles') {
      reportData = {
        summary: reportData.summary,
        incomeByVehicle,
        expensesByVehicle,
        topVehicles
      };
    } else if (type === 'drivers') {
      reportData = {
        summary: reportData.summary,
        incomeByDriver
      };
    }

    return NextResponse.json(reportData);
  } catch (error: any) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate report' },
      { status: 500 }
    );
  }
}

// Export endpoint for downloading reports
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const { format, data, dateRange, type } = await request.json();

    if (!data || !format) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    let content = '';
    let filename = `report-${type}-${new Date().toISOString().split('T')[0]}`;
    let contentType = '';

    if (format === 'csv') {
      // Generate CSV
      const flattenData = (obj: any, prefix = ''): any => {
        const result: any = {};
        for (const key in obj) {
          const value = obj[key];
          const newKey = prefix ? `${prefix}.${key}` : key;
          
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            Object.assign(result, flattenData(value, newKey));
          } else if (Array.isArray(value)) {
            result[newKey] = JSON.stringify(value);
          } else {
            result[newKey] = value;
          }
        }
        return result;
      };

      const flatData = flattenData(data);
      const headers = Object.keys(flatData);
      const values = headers.map(header => flatData[header]);
      
      content = [headers.join(','), values.join(',')].join('\n');
      contentType = 'text/csv';
      filename += '.csv';
    } else if (format === 'json') {
      content = JSON.stringify(data, null, 2);
      contentType = 'application/json';
      filename += '.json';
    }

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });
  } catch (error: any) {
    console.error('Error exporting report:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to export report' },
      { status: 500 }
    );
  }
}