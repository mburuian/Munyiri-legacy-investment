// src/app/api/admin/reports/export/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '../../../../../lib/firebase/admin';

export async function POST(request: NextRequest) {
  try {
    console.log('📊 [EXPORT] Starting report export...');
    
    const auth = await verifyAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('✅ User authenticated:', auth.user?.email);

    const body = await request.json();
    const { format, data, dateRange, type } = body;

    console.log('Export request:', { format, type, hasData: !!data });

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
      // Create CSV content
      const rows: string[][] = [];
      
      // Add header row
      rows.push(['Report Type', type || 'full']);
      rows.push(['Generated On', new Date().toLocaleString()]);
      rows.push(['Date Range', `${dateRange?.start || 'All time'} to ${dateRange?.end || 'Present'}`]);
      rows.push([]); // Empty row for spacing
      
      // Summary section
      if (data.summary) {
        rows.push(['SUMMARY']);
        rows.push(['Metric', 'Value']);
        rows.push(['Total Income', data.summary.totalIncome || 0]);
        rows.push(['Total Expenses', data.summary.totalExpenses || 0]);
        rows.push(['Net Profit', data.summary.netProfit || 0]);
        rows.push(['Profit Margin', `${(data.summary.profitMargin || 0).toFixed(2)}%`]);
        rows.push(['Total Trips', data.summary.totalTrips || 0]);
        rows.push(['Total Distance (km)', data.summary.totalDistance || 0]);
        rows.push(['Active Vehicles', data.summary.activeVehicles || 0]);
        rows.push(['Active Drivers', data.summary.activeDrivers || 0]);
        rows.push([]);
      }
      
      // Income by Vehicle section
      if (data.incomeByVehicle && data.incomeByVehicle.length > 0) {
        rows.push(['INCOME BY VEHICLE']);
        rows.push(['Plate Number', 'Model', 'Total Income', 'Trips', 'Distance (km)', 'Avg per Trip', 'Contribution (%)']);
        data.incomeByVehicle.forEach((vehicle: any) => {
          rows.push([
            vehicle.plateNumber,
            vehicle.model,
            vehicle.totalIncome.toString(),
            vehicle.totalTrips.toString(),
            vehicle.totalDistance.toString(),
            vehicle.avgPerTrip.toString(),
            vehicle.contribution.toFixed(2)
          ]);
        });
        rows.push([]);
      }
      
      // Income by Driver section
      if (data.incomeByDriver && data.incomeByDriver.length > 0) {
        rows.push(['INCOME BY DRIVER']);
        rows.push(['Driver Name', 'Email', 'Total Income', 'Trips', 'Distance (km)', 'Rating']);
        data.incomeByDriver.forEach((driver: any) => {
          rows.push([
            driver.name,
            driver.email,
            driver.totalIncome.toString(),
            driver.totalTrips.toString(),
            driver.totalDistance.toString(),
            (driver.avgRating || 0).toFixed(1)
          ]);
        });
        rows.push([]);
      }
      
      // Monthly Trends
      if (data.monthlyTrends && data.monthlyTrends.length > 0) {
        rows.push(['MONTHLY TRENDS']);
        rows.push(['Month', 'Income', 'Expenses', 'Profit', 'Trips']);
        data.monthlyTrends.forEach((trend: any) => {
          rows.push([
            trend.month,
            trend.income.toString(),
            trend.expenses.toString(),
            trend.profit.toString(),
            trend.trips.toString()
          ]);
        });
        rows.push([]);
      }
      
      // Recent Transactions
      if (data.recentTransactions && data.recentTransactions.length > 0) {
        rows.push(['RECENT TRANSACTIONS']);
        rows.push(['Date', 'Type', 'Vehicle', 'Driver', 'Amount', 'Description']);
        data.recentTransactions.forEach((transaction: any) => {
          rows.push([
            new Date(transaction.date).toLocaleDateString(),
            transaction.type,
            transaction.vehicle,
            transaction.driver,
            transaction.amount.toString(),
            transaction.description || ''
          ]);
        });
      }
      
      // Convert rows to CSV string
      content = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
      contentType = 'text/csv; charset=utf-8';
      filename += '.csv';
      
    } else if (format === 'json') {
      content = JSON.stringify(data, null, 2);
      contentType = 'application/json';
      filename += '.json';
    }

    console.log(`✅ Export successful: ${filename} (${content.length} bytes)`);

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
    
  } catch (error: any) {
    console.error('❌ Error exporting report:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to export report' },
      { status: 500 }
    );
  }
}