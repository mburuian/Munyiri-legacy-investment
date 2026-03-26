'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft,
  Radio,
  MapPin,
  Activity,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Settings,
  CreditCard,
  Truck,
  Users,
  DollarSign,
  Bell,
  Zap,
  Shield,
  Cloud,
  Database,
  ExternalLink,
  Play,
  Pause,
  Trash2,
  Edit,
  Eye,
  Plus,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  Download,
  Calendar,
  Clock,
  TrendingUp,
  BarChart3,
  Globe,
  Wifi,
  WifiOff,
  Battery,
  BatteryFull,
  BatteryMedium,
  BatteryLow,
  Map,
  Layers,
  Satellite,
  Route,
  Target,
  Compass,
  Gauge,
  Fuel,
  Thermometer,
  Wind,
  Camera,
  Mic,
  Speaker,
  Bluetooth,
  Usb,
  HardDrive,
  Cpu,
  Server,
  Network,
  Lock,
  Unlock,
  Key,
  Fingerprint,
  Scan,
  QrCode,
  Barcode,
  Receipt,
  FileText,
  Printer,
  Mail,
  MessageSquare,
  Phone,
  Video,
  Headphones,
  Music,
  Radio as RadioIcon,
  Tv,
  Monitor,
  Tablet,
  Watch,
  Laptop,
  Smartphone as SmartphoneIcon,
  TabletSmartphone,
  Wifi as WifiIcon,
  Bluetooth as BluetoothIcon,
  Plug,
  Power,
  BatteryCharging,
  Fan,
  Snowflake,
  Sun,
  Moon,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudSun,
  CloudMoon,
  Wind as WindIcon,
  Droplets,
  Thermometer as ThermometerIcon,
  Compass as CompassIcon,
  Navigation as NavigationIcon,
  MapPin as MapPinIcon,
  Route as RouteIcon,
  Target as TargetIcon,
  Gauge as GaugeIcon,
  Fuel as FuelIcon,
  Car,
  Bus,
  Bike,
  Train,
  Plane,
  Ship,
  Package,
  Box,
  Warehouse,
  Factory,
  Building,
  Home,
  Hospital,
  School,
  University,
  Church,
  Store,
  Hotel,
  Library,
  Book,
  Newspaper,
  Podcast,
  Satellite as SatelliteIcon,
  Antenna,
  Radar,
  X // Add X for close buttons
} from 'lucide-react';

// Firebase imports
let auth: any = null;
let onAuthStateChanged: any = null;

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: any;
  status: 'connected' | 'disconnected' | 'pending' | 'error';
  category: 'payment' | 'tracking' | 'communication' | 'analytics' | 'automation';
  config?: any;
  lastSync?: string;
  features: string[];
  pricing?: string;
  docs?: string;
  comingSoon?: boolean;
}

interface PaybillConfig {
  businessNumber: string;
  tillNumber: string;
  accountNumber: string;
  consumerKey: string;
  consumerSecret: string;
  passkey: string;
  webhookUrl: string;
  callbackUrl: string;
}

interface GPSConfig {
  provider: 'google' | 'here' | 'tomtom' | 'custom';
  apiKey: string;
  updateInterval: number;
  geofencingEnabled: boolean;
  routeOptimization: boolean;
  alertsEnabled: boolean;
  deviceIds: string[];
}

function IntegrationsContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedIntegration, setExpandedIntegration] = useState<string | null>(null);
  const [showPaybillModal, setShowPaybillModal] = useState(false);
  const [showGPSModal, setShowGPSModal] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  
  // Paybill config state
  const [paybillConfig, setPaybillConfig] = useState<PaybillConfig>({
    businessNumber: '',
    tillNumber: '',
    accountNumber: '',
    consumerKey: '',
    consumerSecret: '',
    passkey: '',
    webhookUrl: '',
    callbackUrl: ''
  });

  // GPS config state
  const [gpsConfig, setGpsConfig] = useState<GPSConfig>({
    provider: 'google',
    apiKey: '',
    updateInterval: 30,
    geofencingEnabled: true,
    routeOptimization: true,
    alertsEnabled: true,
    deviceIds: []
  });

  // Integration data
  const integrations: Integration[] = [
    {
      id: 'mpesa-paybill',
      name: 'M-Pesa Paybill',
      description: 'Receive payments via M-Pesa Paybill. Automatically record income and send receipts.',
      icon: CreditCard,
      status: 'disconnected',
      category: 'payment',
      features: [
        'Automatic payment recording',
        'Real-time transaction updates',
        'Digital receipts',
        'SMS notifications',
        'Transaction history'
      ],
      pricing: 'Free (M-Pesa rates apply)',
      docs: 'https://developer.safaricom.co.ke/docs'
    },
    {
      id: 'gps-tracking',
      name: 'GPS Vehicle Tracking',
      description: 'Real-time vehicle tracking, route optimization, and geofencing alerts.',
      icon: MapPin,
      status: 'disconnected',
      category: 'tracking',
      features: [
        'Real-time location tracking',
        'Route history playback',
        'Geofence alerts',
        'Speed monitoring',
        'Fuel consumption tracking',
        'Maintenance reminders'
      ],
      pricing: 'From $29/month per vehicle',
      docs: 'https://developers.google.com/maps/documentation'
    },
  ];

  // Load Firebase
  useEffect(() => {
    const loadFirebase = async () => {
      try {
        const firebaseModule = await import('../../../../lib/firebase/client');
        const authModule = await import('firebase/auth');
        
        auth = firebaseModule.auth;
        onAuthStateChanged = authModule.onAuthStateChanged;
        setFirebaseReady(true);
      } catch (error) {
        console.error('Failed to load Firebase:', error);
        setError('Failed to initialize authentication');
        setFirebaseReady(true);
      } finally {
        setLoading(false);
      }
    };
    
    loadFirebase();
  }, []);

  // Check authentication
  useEffect(() => {
    if (!firebaseReady) return;
    
    const unsubscribe = onAuthStateChanged(auth, (user: any) => {
      if (!user) {
        router.push('/auth/login');
        return;
      }
    });

    return () => unsubscribe();
  }, [firebaseReady, router]);

  const filteredIntegrations = selectedCategory === 'all' 
    ? integrations 
    : integrations.filter(i => i.category === selectedCategory);

  const getStatusBadge = (status: string, comingSoon?: boolean) => {
    if (comingSoon) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30">
          Coming Soon
        </span>
      );
    }
    
    switch (status) {
      case 'connected':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Connected
          </span>
        );
      case 'disconnected':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400 border border-gray-500/30 flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            Not Connected
          </span>
        );
      case 'pending':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            Pending
          </span>
        );
      case 'error':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Error
          </span>
        );
      default:
        return null;
    }
  };

  const handleConnect = (integrationId: string) => {
    if (integrationId === 'mpesa-paybill') {
      setShowPaybillModal(true);
    } else if (integrationId === 'gps-tracking') {
      setShowGPSModal(true);
    } else {
      alert(`Connect to ${integrationId} - Configuration coming soon!`);
    }
  };

  const handleSavePaybill = async () => {
    setSavingConfig(true);
    try {
      const user = auth.currentUser;
      const token = await user.getIdToken();
      
      const response = await fetch('/api/integrations/mpesa', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(paybillConfig)
      });
      
      if (!response.ok) throw new Error('Failed to save configuration');
      
      alert('M-Pesa Paybill integration configured successfully!');
      setShowPaybillModal(false);
      
      // Update integration status in UI
      const integration = integrations.find(i => i.id === 'mpesa-paybill');
      if (integration) integration.status = 'connected';
      
    } catch (error) {
      console.error('Error saving Paybill config:', error);
      alert('Failed to save configuration. Please try again.');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleSaveGPS = async () => {
    setSavingConfig(true);
    try {
      const user = auth.currentUser;
      const token = await user.getIdToken();
      
      const response = await fetch('/api/integrations/gps', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(gpsConfig)
      });
      
      if (!response.ok) throw new Error('Failed to save GPS configuration');
      
      alert('GPS tracking configured successfully!');
      setShowGPSModal(false);
      
      // Update integration status in UI
      const integration = integrations.find(i => i.id === 'gps-tracking');
      if (integration) integration.status = 'connected';
      
    } catch (error) {
      console.error('Error saving GPS config:', error);
      alert('Failed to save configuration. Please try again.');
    } finally {
      setSavingConfig(false);
    }
  };

  if (loading || !firebaseReady) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-yellow-400/20 border-t-yellow-400 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading integrations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl animate-pulse animation-delay-2000"></div>
      </div>

      {/* Header */}
      <div className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-xl border-b border-yellow-500/20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboards/admin"
                className="p-2 hover:bg-slate-800 rounded-xl transition border border-yellow-500/20 group"
              >
                <ArrowLeft className="w-5 h-5 text-gray-400 group-hover:text-yellow-400 transition" />
              </Link>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-yellow-500/20">
                    <Plug className="w-5 h-5 text-black" />
                  </div>
                  <h1 className="text-2xl font-bold text-white">Integrations</h1>
                </div>
                <p className="text-sm text-gray-500 flex items-center gap-2">
                  <Radio className="w-3 h-3 text-yellow-400" />
                  Connect external services to enhance your fleet management
                </p>
              </div>
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap ${
                selectedCategory === 'all'
                  ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                  : 'bg-slate-800/50 text-gray-400 border border-yellow-500/20 hover:bg-slate-700'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSelectedCategory('payment')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap ${
                selectedCategory === 'payment'
                  ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                  : 'bg-slate-800/50 text-gray-400 border border-yellow-500/20 hover:bg-slate-700'
              }`}
            >
              <CreditCard className="w-4 h-4 inline mr-1" />
              Payments
            </button>
            <button
              onClick={() => setSelectedCategory('tracking')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap ${
                selectedCategory === 'tracking'
                  ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                  : 'bg-slate-800/50 text-gray-400 border border-yellow-500/20 hover:bg-slate-700'
              }`}
            >
              <MapPin className="w-4 h-4 inline mr-1" />
              Tracking
            </button>
            <button
              onClick={() => setSelectedCategory('communication')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap ${
                selectedCategory === 'communication'
                  ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                  : 'bg-slate-800/50 text-gray-400 border border-yellow-500/20 hover:bg-slate-700'
              }`}
            >
              <MessageSquare className="w-4 h-4 inline mr-1" />
              Communication
            </button>
            <button
              onClick={() => setSelectedCategory('analytics')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap ${
                selectedCategory === 'analytics'
                  ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                  : 'bg-slate-800/50 text-gray-400 border border-yellow-500/20 hover:bg-slate-700'
              }`}
            >
              <BarChart3 className="w-4 h-4 inline mr-1" />
              Analytics
            </button>
            <button
              onClick={() => setSelectedCategory('automation')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap ${
                selectedCategory === 'automation'
                  ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                  : 'bg-slate-800/50 text-gray-400 border border-yellow-500/20 hover:bg-slate-700'
              }`}
            >
              <Zap className="w-4 h-4 inline mr-1" />
              Automation
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400" />
              <span className="text-sm text-rose-300">{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-300">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Integrations Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredIntegrations.map((integration) => {
            const IconComponent = integration.icon;
            const isExpanded = expandedIntegration === integration.id;
            
            return (
              <div
                key={integration.id}
                className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-yellow-500/20 rounded-2xl overflow-hidden hover:border-yellow-400/30 transition-all duration-300"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-yellow-500/20 to-amber-600/20 rounded-xl flex items-center justify-center">
                        <IconComponent className="w-6 h-6 text-yellow-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">{integration.name}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">{integration.category}</p>
                      </div>
                    </div>
                    {getStatusBadge(integration.status, integration.comingSoon)}
                  </div>
                  
                  <p className="text-sm text-gray-400 mb-4">{integration.description}</p>
                  
                  {/* Features Preview */}
                  <div className="mb-4">
                    <p className="text-xs font-medium text-gray-500 mb-2">Key Features:</p>
                    <div className="flex flex-wrap gap-2">
                      {integration.features.slice(0, 3).map((feature, idx) => (
                        <span key={idx} className="text-xs px-2 py-1 bg-slate-700/50 rounded-lg text-gray-400">
                          {feature}
                        </span>
                      ))}
                      {integration.features.length > 3 && (
                        <span className="text-xs px-2 py-1 bg-slate-700/50 rounded-lg text-gray-400">
                          +{integration.features.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {integration.pricing && (
                    <div className="text-xs text-gray-500 mb-4 flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      {integration.pricing}
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => setExpandedIntegration(isExpanded ? null : integration.id)}
                      className="flex-1 px-4 py-2 border border-yellow-500/20 rounded-xl text-gray-300 text-sm font-medium hover:bg-slate-800 transition flex items-center justify-center gap-2"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-4 h-4" />
                          Show Less
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4" />
                          View Details
                        </>
                      )}
                    </button>
                    {!integration.comingSoon && (
                      <button
                        onClick={() => handleConnect(integration.id)}
                        disabled={integration.status === 'connected'}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition flex items-center gap-2 ${
                          integration.status === 'connected'
                            ? 'bg-green-500/20 text-green-400 cursor-not-allowed'
                            : 'bg-gradient-to-r from-yellow-400 to-amber-500 text-black hover:from-yellow-300 hover:to-amber-400'
                        }`}
                      >
                        {integration.status === 'connected' ? (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            Connected
                          </>
                        ) : (
                          <>
                            <Plug className="w-4 h-4" />
                            Connect
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-yellow-500/20 bg-slate-900/50 p-6">
                    <h4 className="text-sm font-semibold text-yellow-400 mb-3">All Features</h4>
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {integration.features.map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs text-gray-400">
                          <CheckCircle className="w-3 h-3 text-green-400" />
                          {feature}
                        </div>
                      ))}
                    </div>
                    
                    {integration.docs && (
                      <a
                        href={integration.docs}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-xs text-yellow-400 hover:text-yellow-300 transition"
                      >
                        <ExternalLink className="w-3 h-3" />
                        View Documentation
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Coming Soon Section */}
        <div className="mt-12 pt-8 border-t border-yellow-500/20">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">More Integrations Coming Soon</h2>
            <p className="text-gray-500">We're constantly working on adding more integrations to enhance your experience</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-800/30 rounded-xl p-6 text-center border border-yellow-500/20">
              <div className="w-16 h-16 bg-purple-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Server className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">IoT Sensors</h3>
              <p className="text-sm text-gray-500">Real-time sensor data for temperature, humidity, and cargo monitoring</p>
            </div>
            <div className="bg-slate-800/30 rounded-xl p-6 text-center border border-yellow-500/20">
              <div className="w-16 h-16 bg-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Cloud className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Weather API</h3>
              <p className="text-sm text-gray-500">Weather-based route planning and alerts for drivers</p>
            </div>
            <div className="bg-slate-800/30 rounded-xl p-6 text-center border border-yellow-500/20">
              <div className="w-16 h-16 bg-cyan-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Database className="w-8 h-8 text-cyan-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">BI Tools</h3>
              <p className="text-sm text-gray-500">Connect to Tableau, PowerBI, and other analytics platforms</p>
            </div>
          </div>
        </div>
      </div>

      {/* Paybill Configuration Modal */}
      {showPaybillModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl border border-yellow-500/20 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-900/95 backdrop-blur-sm border-b border-yellow-500/20 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-xl flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-black" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Configure M-Pesa Paybill</h2>
                    <p className="text-sm text-gray-400">Set up your M-Pesa Paybill integration</p>
                  </div>
                </div>
                <button onClick={() => setShowPaybillModal(false)} className="p-2 hover:bg-slate-800 rounded-lg transition">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-amber-400 font-medium mb-1">Before you start</p>
                    <p className="text-xs text-amber-400/70">You'll need your M-Pesa Paybill credentials from Safaricom. This includes Business Number, Till Number, Consumer Key, and Consumer Secret.</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Business Number *</label>
                  <input
                    type="text"
                    value={paybillConfig.businessNumber}
                    onChange={(e) => setPaybillConfig({...paybillConfig, businessNumber: e.target.value})}
                    className="w-full bg-slate-800/50 border border-yellow-500/20 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400"
                    placeholder="e.g., 123456"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Till Number *</label>
                  <input
                    type="text"
                    value={paybillConfig.tillNumber}
                    onChange={(e) => setPaybillConfig({...paybillConfig, tillNumber: e.target.value})}
                    className="w-full bg-slate-800/50 border border-yellow-500/20 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400"
                    placeholder="e.g., 123456"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Account Number *</label>
                  <input
                    type="text"
                    value={paybillConfig.accountNumber}
                    onChange={(e) => setPaybillConfig({...paybillConfig, accountNumber: e.target.value})}
                    className="w-full bg-slate-800/50 border border-yellow-500/20 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400"
                    placeholder="Your business account number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Consumer Key *</label>
                  <input
                    type="text"
                    value={paybillConfig.consumerKey}
                    onChange={(e) => setPaybillConfig({...paybillConfig, consumerKey: e.target.value})}
                    className="w-full bg-slate-800/50 border border-yellow-500/20 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400"
                    placeholder="Your M-Pesa consumer key"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Consumer Secret *</label>
                  <input
                    type="password"
                    value={paybillConfig.consumerSecret}
                    onChange={(e) => setPaybillConfig({...paybillConfig, consumerSecret: e.target.value})}
                    className="w-full bg-slate-800/50 border border-yellow-500/20 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400"
                    placeholder="Your M-Pesa consumer secret"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Passkey *</label>
                  <input
                    type="password"
                    value={paybillConfig.passkey}
                    onChange={(e) => setPaybillConfig({...paybillConfig, passkey: e.target.value})}
                    className="w-full bg-slate-800/50 border border-yellow-500/20 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400"
                    placeholder="Your M-Pesa passkey"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Webhook URL</label>
                  <input
                    type="url"
                    value={paybillConfig.webhookUrl}
                    onChange={(e) => setPaybillConfig({...paybillConfig, webhookUrl: e.target.value})}
                    className="w-full bg-slate-800/50 border border-yellow-500/20 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400"
                    placeholder="https://your-domain.com/api/webhooks/mpesa"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-yellow-500/20">
                <button
                  onClick={() => setShowPaybillModal(false)}
                  className="flex-1 px-4 py-2 border border-yellow-500/20 rounded-xl text-gray-300 font-medium hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePaybill}
                  disabled={savingConfig}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-yellow-400 to-amber-500 text-black rounded-xl font-medium hover:from-yellow-300 hover:to-amber-400 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {savingConfig ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Save Configuration
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GPS Configuration Modal */}
      {showGPSModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl border border-yellow-500/20 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-900/95 backdrop-blur-sm border-b border-yellow-500/20 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-xl flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-black" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Configure GPS Tracking</h2>
                    <p className="text-sm text-gray-400">Set up real-time vehicle tracking</p>
                  </div>
                </div>
                <button onClick={() => setShowGPSModal(false)} className="p-2 hover:bg-slate-800 rounded-lg transition">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Provider *</label>
                  <select
                    value={gpsConfig.provider}
                    onChange={(e) => setGpsConfig({...gpsConfig, provider: e.target.value as any})}
                    className="w-full bg-slate-800/50 border border-yellow-500/20 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-yellow-400"
                  >
                    <option value="google">Google Maps</option>
                    <option value="here">HERE Maps</option>
                    <option value="tomtom">TomTom</option>
                    <option value="custom">Custom Provider</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">API Key *</label>
                  <input
                    type="password"
                    value={gpsConfig.apiKey}
                    onChange={(e) => setGpsConfig({...gpsConfig, apiKey: e.target.value})}
                    className="w-full bg-slate-800/50 border border-yellow-500/20 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400"
                    placeholder="Your GPS provider API key"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Update Interval (seconds)</label>
                  <input
                    type="number"
                    value={gpsConfig.updateInterval}
                    onChange={(e) => setGpsConfig({...gpsConfig, updateInterval: parseInt(e.target.value)})}
                    className="w-full bg-slate-800/50 border border-yellow-500/20 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400"
                    min="5"
                    max="300"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={gpsConfig.geofencingEnabled}
                    onChange={(e) => setGpsConfig({...gpsConfig, geofencingEnabled: e.target.checked})}
                    className="w-4 h-4 rounded border-yellow-500/20 bg-slate-800 text-yellow-500 focus:ring-yellow-500"
                  />
                  <span className="text-sm text-gray-300">Enable Geofencing Alerts</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={gpsConfig.routeOptimization}
                    onChange={(e) => setGpsConfig({...gpsConfig, routeOptimization: e.target.checked})}
                    className="w-4 h-4 rounded border-yellow-500/20 bg-slate-800 text-yellow-500 focus:ring-yellow-500"
                  />
                  <span className="text-sm text-gray-300">Enable Route Optimization</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={gpsConfig.alertsEnabled}
                    onChange={(e) => setGpsConfig({...gpsConfig, alertsEnabled: e.target.checked})}
                    className="w-4 h-4 rounded border-yellow-500/20 bg-slate-800 text-yellow-500 focus:ring-yellow-500"
                  />
                  <span className="text-sm text-gray-300">Enable Speed & Behavior Alerts</span>
                </label>
              </div>

              <div className="flex gap-3 pt-4 border-t border-yellow-500/20">
                <button
                  onClick={() => setShowGPSModal(false)}
                  className="flex-1 px-4 py-2 border border-yellow-500/20 rounded-xl text-gray-300 font-medium hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveGPS}
                  disabled={savingConfig}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-yellow-400 to-amber-500 text-black rounded-xl font-medium hover:from-yellow-300 hover:to-amber-400 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {savingConfig ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Save Configuration
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        .animate-pulse {
          animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
      `}</style>
    </div>
  );
}

function IntegrationsFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-yellow-400/20 border-t-yellow-400 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-400">Loading integrations...</p>
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <Suspense fallback={<IntegrationsFallback />}>
      <IntegrationsContent />
    </Suspense>
  );
}