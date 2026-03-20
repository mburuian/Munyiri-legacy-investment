import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { verifyDriverAuth } from '../../../../lib/firebase/admin';

export async function GET(request: NextRequest) {
  try {
    console.log('='.repeat(50));
    console.log('🚀 Driver Vehicle API Called');
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

    // Find the user in database
    console.log('\n🔍 Looking up user in database...');
    
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
        { error: 'No vehicle assigned to you yet' },
        { status: 404 }
      );
    }

    const vehicleId = dbUser.driver.assignedVehicle.id;
    console.log('✅ Driver found, vehicle ID:', vehicleId);

    // Fetch complete vehicle details with all relations
    console.log('\n🔍 Fetching vehicle details...');
    
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: {
        documents: {
          orderBy: { uploadedAt: 'desc' },
          select: {
            id: true,
            type: true,
            name: true,
            fileUrl: true,
            uploadedAt: true,
            expiryDate: true,
            notes: true
          }
        },
        maintenance: {
          orderBy: { date: 'desc' },
          select: {
            id: true,
            type: true,
            description: true,
            cost: true,
            date: true,
            completedAt: true,
            odometer: true,
            performedBy: true,
            nextDueDate: true,
            nextDueKm: true,
            status: true,
            notes: true,
            garageName: true,
            garageContact: true,
            receipt: true
          }
        },
        trips: {
          orderBy: { startTime: 'desc' },
          take: 100, // Get enough trips for accurate stats
          select: {
            id: true,
            startTime: true,
            endTime: true,
            startLocation: true,
            endLocation: true,
            distanceKm: true,
            fare: true,
            status: true,
            startOdometer: true,
            endOdometer: true
          }
        },
        alerts: {
          where: { resolved: false },
          orderBy: { severity: 'desc' },
          select: {
            id: true,
            type: true,
            severity: true,
            title: true,
            description: true,
            dueDate: true,
            resolved: true
          }
        },
        expenses: {
          where: {
            category: 'FUEL'
          },
          select: {
            amount: true,
            date: true
          }
        }
      }
    });

    if (!vehicle) {
      console.log('❌ Vehicle not found');
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    console.log('✅ Vehicle found:', vehicle.plateNumber);

    // Calculate vehicle statistics
    console.log('\n📊 Calculating vehicle statistics...');

    // Total distance from trips
    const totalDistance = vehicle.trips?.reduce((sum, trip) => sum + (trip.distanceKm || 0), 0) || 0;

    // Calculate fuel efficiency from trips and fuel expenses
    const totalFuelCost = vehicle.expenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0;
    
    // Get total fuel from expenses (you might want to add a fuel quantity field to Expense model)
    // For now, estimate based on average fuel price
    const avgFuelPrice = 150; // KES per liter (adjust based on your region)
    const totalFuelLiters = totalFuelCost / avgFuelPrice;
    const averageFuelEfficiency = totalFuelLiters > 0 ? totalDistance / totalFuelLiters : 8.5;

    // Total maintenance cost
    const totalMaintenanceCost = vehicle.maintenance?.reduce((sum, record) => sum + (record.cost || 0), 0) || 0;

    // Last service details
    const completedMaintenance = vehicle.maintenance?.filter(m => m.status === 'COMPLETED');
    const lastService = completedMaintenance?.[0]; // Most recent completed maintenance
    const lastServiceDate = lastService ? lastService.date.toISOString() : null;
    const lastServiceOdometer = lastService?.odometer;

    // Next service details
    const pendingMaintenance = vehicle.maintenance?.filter(m => m.status === 'PENDING' || m.status === 'IN_PROGRESS');
    const nextService = pendingMaintenance?.[0]; // Most urgent pending maintenance
    
    let daysUntilNextService = 0;
    let kmUntilNextService = 0;
    let nextServiceType = '';

    if (nextService) {
      nextServiceType = nextService.type.replace(/_/g, ' ').toLowerCase();
      
      if (nextService.nextDueDate) {
        const today = new Date();
        const dueDate = new Date(nextService.nextDueDate);
        daysUntilNextService = Math.max(0, Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
      }

      if (nextService.nextDueKm) {
        const latestTrip = vehicle.trips?.[0];
        const currentOdometer = latestTrip?.endOdometer || latestTrip?.startOdometer || 0;
        kmUntilNextService = Math.max(0, nextService.nextDueKm - currentOdometer);
      }
    }

    // Insurance days left
    const insuranceDoc = vehicle.documents?.find(d => d.type === 'INSURANCE' && d.expiryDate);
    let insuranceDaysLeft = 0;
    if (insuranceDoc?.expiryDate) {
      const today = new Date();
      const expiryDate = new Date(insuranceDoc.expiryDate);
      insuranceDaysLeft = Math.max(0, Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
    }

    // Total trips
    const totalTrips = vehicle.trips?.length || 0;

    // Total earnings from trips
    const totalEarnings = vehicle.trips?.reduce((sum, trip) => sum + (trip.fare || 0), 0) || 0;

    // Get total expenses from expenses table
    const totalExpensesResult = await prisma.expense.aggregate({
      where: {
        vehicleId: vehicle.id
      },
      _sum: {
        amount: true
      }
    });
    const totalExpenses = (totalExpensesResult._sum.amount || 0) + totalMaintenanceCost;

    // Get latest odometer reading
    const latestTrip = vehicle.trips?.[0];
    const currentOdometer = latestTrip?.endOdometer || latestTrip?.startOdometer || 0;

    // Format documents with status
    const formattedDocuments = vehicle.documents?.map(doc => {
      let status: 'valid' | 'expiring' | 'expired' = 'valid';
      
      if (doc.expiryDate) {
        const today = new Date();
        const expiryDate = new Date(doc.expiryDate);
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysUntilExpiry < 0) {
          status = 'expired';
        } else if (daysUntilExpiry <= 30) {
          status = 'expiring';
        }
      }
      
      return {
        id: doc.id,
        type: doc.type,
        name: doc.name,
        fileUrl: doc.fileUrl,
        uploadedAt: doc.uploadedAt.toISOString(),
        expiryDate: doc.expiryDate?.toISOString(),
        status,
        notes: doc.notes
      };
    }) || [];

    // Format maintenance records
    const formattedMaintenance = vehicle.maintenance?.map(record => ({
      id: record.id,
      type: record.type,
      description: record.description,
      cost: record.cost,
      date: record.date.toISOString(),
      completedAt: record.completedAt?.toISOString(),
      odometer: record.odometer,
      performedBy: record.performedBy,
      nextDueDate: record.nextDueDate?.toISOString(),
      nextDueKm: record.nextDueKm,
      status: record.status,
      notes: record.notes,
      garageName: record.garageName,
      garageContact: record.garageContact,
      receipt: record.receipt
    })) || [];

    // Generate maintenance alerts based on pending maintenance
    const maintenanceAlerts = vehicle.maintenance
      ?.filter(m => m.status === 'PENDING' && (m.nextDueDate || m.nextDueKm))
      .map(m => ({
        id: `maintenance-${m.id}`,
        type: 'MAINTENANCE',
        severity: getMaintenanceSeverity(m.nextDueDate, m.nextDueKm, currentOdometer),
        title: `${m.type.replace(/_/g, ' ')} Due Soon`,
        description: m.description || `Vehicle due for ${m.type.replace(/_/g, ' ').toLowerCase()}`,
        dueDate: m.nextDueDate?.toISOString(),
        resolved: false
      })) || [];

    // Format existing alerts
    const existingAlerts = vehicle.alerts?.map(alert => ({
      id: alert.id,
      type: alert.type,
      severity: alert.severity,
      title: alert.title,
      description: alert.description,
      dueDate: alert.dueDate?.toISOString(),
      resolved: alert.resolved
    })) || [];

    // Combine and sort all alerts by severity and due date
    const allAlerts = [...existingAlerts, ...maintenanceAlerts].sort((a, b) => {
      const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      const aSeverity = severityOrder[a.severity as keyof typeof severityOrder] || 4;
      const bSeverity = severityOrder[b.severity as keyof typeof severityOrder] || 4;
      
      if (aSeverity !== bSeverity) return aSeverity - bSeverity;
      
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      
      return 0;
    });

    // Format next service date for display
    const nextServiceDate = nextService?.nextDueDate 
      ? new Date(nextService.nextDueDate).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        })
      : 'Not scheduled';

    // Format insurance expiry for display
    const insuranceExpiryDate = insuranceDoc?.expiryDate
      ? new Date(insuranceDoc.expiryDate).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        })
      : 'Not set';

    // Get vehicle details (you should add these fields to your Vehicle model)
    const getVehicleColor = () => {
      // This should come from your Vehicle model
      // For now, return a default
      return 'White';
    };

    const getVehicleYear = () => {
      // This should come from your Vehicle model
      // For now, extract from model or return current year
      const yearMatch = vehicle.model.match(/\b(19|20)\d{2}\b/);
      return yearMatch ? parseInt(yearMatch[0]) : new Date().getFullYear();
    };

    const getVehicleVin = () => {
      // This should come from your Vehicle model
      return `VIN-${vehicle.id.slice(-8).toUpperCase()}`;
    };

    const getVehicleEngineNumber = () => {
      // This should come from your Vehicle model
      return `ENG-${vehicle.id.slice(-6).toUpperCase()}`;
    };

    const getVehicleFuelType = () => {
      // This should come from your Vehicle model
      // You could also detect from maintenance records
      return 'diesel';
    };

    const getVehicleTransmission = () => {
      // This should come from your Vehicle model
      return 'manual';
    };

    // Calculate fuel level (you'll need to implement this based on your fuel tracking)
    const calculateFuelLevel = () => {
      // This could be based on recent fuel logs
      // For now, return a placeholder
      return 75;
    };

    // Prepare response
    const response = {
      vehicle: {
        id: vehicle.id,
        plateNumber: vehicle.plateNumber,
        model: vehicle.model,
        capacity: vehicle.capacity,
        status: vehicle.status.toLowerCase(),
        fuelLevel: calculateFuelLevel(),
        odometer: currentOdometer,
        nextService: nextServiceDate,
        insuranceExpiry: insuranceExpiryDate,
        year: getVehicleYear(),
        color: getVehicleColor(),
        vin: getVehicleVin(),
        engineNumber: getVehicleEngineNumber(),
        fuelType: getVehicleFuelType(),
        transmission: getVehicleTransmission()
      },
      documents: formattedDocuments,
      maintenance: formattedMaintenance,
      alerts: allAlerts,
      stats: {
        totalDistance,
        averageFuelEfficiency: parseFloat(averageFuelEfficiency.toFixed(1)),
        totalMaintenanceCost,
        lastServiceDate: lastServiceDate ? new Date(lastServiceDate).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        }) : 'Never',
        lastServiceOdometer,
        daysUntilNextService,
        kmUntilNextService,
        insuranceDaysLeft,
        totalTrips,
        totalEarnings,
        totalExpenses,
        nextServiceType
      }
    };

    console.log('✅ Response prepared successfully');
    console.log('Vehicle stats:', response.stats);
    console.log('Total alerts:', allAlerts.length);
    console.log('='.repeat(50));

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('❌ Error fetching vehicle data:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch vehicle data' },
      { status: 500 }
    );
  }
}

// Helper function to determine maintenance severity
function getMaintenanceSeverity(dueDate?: Date | null, dueKm?: number | null, currentOdometer: number = 0): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  if (dueDate) {
    const today = new Date();
    const due = new Date(dueDate);
    const daysUntilDue = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDue < 0) return 'CRITICAL';
    if (daysUntilDue <= 3) return 'HIGH';
    if (daysUntilDue <= 7) return 'MEDIUM';
    return 'LOW';
  }
  
  if (dueKm) {
    const kmUntilDue = dueKm - currentOdometer;
    if (kmUntilDue < 0) return 'CRITICAL';
    if (kmUntilDue <= 100) return 'HIGH';
    if (kmUntilDue <= 500) return 'MEDIUM';
    return 'LOW';
  }
  
  return 'LOW';
}