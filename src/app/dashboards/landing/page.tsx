"use client";

import Link from "next/link";
import { useRef, useState, useEffect } from "react";
import Image from "next/image";
import {
  TrendingUp,
  DollarSign,
  Car,
  Users,
  BarChart3,
  FileText,
  ArrowRight,
  PieChart,
  Clock,
  Shield,
  Fuel,
  Wrench,
  MapPin,
  Zap,
  Target,
  Award,
  ChevronRight,
  Sparkles,
  Gauge,
  UserCog,
  UserCircle,
  KeyRound,
  Globe,
  CheckCircle,
  Activity,
  Navigation,
  Smartphone,
  Cloud,
  Lock,
  Bell,
  AlertCircle,
  Radio,
  Route,
  Navigation2,
  ParkingCircle,
  Timer,
  Wallet,
  CreditCard,
  FuelIcon,
  Settings,
  AlertTriangle,
  Camera,
  ShieldCheck,
  Phone,
  Mail,
  Map,
  UserCheck,
  Truck,
  CircleDollarSign,
  Calendar,
  FileSpreadsheet,
  ScrollText,
  BookOpen,
  Menu,
  X
} from "lucide-react";

export default function LandingPage() {
  const featuresRef = useRef<HTMLElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // Fixed building heights for city skyline (consistent between server and client)
  const buildingHeights = [45, 62, 38, 71, 53, 29, 64, 48, 55, 42, 67, 39, 58, 46, 51];

  // Smooth scroll function
  const scrollToFeatures = () => {
    featuresRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Handle mounting state to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render animated elements until after mount
  if (!mounted) {
    return null; // or a loading skeleton
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white font-sans overflow-x-hidden">
      {/* Animated background elements - only render after mount */}
      {mounted && (
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          {/* Road lines animation */}
          <div className="absolute top-0 left-0 w-full h-full opacity-10">
            <div className="relative w-full h-full">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-full h-0.5 bg-yellow-400"
                  style={{
                    top: `${i * 5}%`,
                    transform: `translateX(${i % 2 === 0 ? '-50%' : '0'})`,
                    animation: `moveRoad ${15 + i}s linear infinite`,
                    opacity: 0.3
                  }}
                />
              ))}
            </div>
          </div>
          
          {/* City skyline silhouette - using fixed heights */}
          <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-yellow-500/5 to-transparent">
            <div className="flex justify-around items-end h-full">
              {buildingHeights.map((height, i) => (
                <div
                  key={i}
                  className="w-16 bg-yellow-500/10"
                  style={{
                    height: `${height}px`,
                    transform: `skewX(-10deg)`
                  }}
                />
              ))}
            </div>
          </div>

          {/* Moving taxis (very subtle) - only render after mount */}
          <div className="absolute bottom-20 left-0 w-full">
            <div className="relative w-full h-20">
              <div className="absolute animate-moveTaxi opacity-5" style={{ animation: 'moveTaxi 20s linear infinite' }}>
                <Car className="w-12 h-12 text-yellow-400" />
              </div>
              <div className="absolute animate-moveTaxi opacity-5" style={{ animation: 'moveTaxi 25s linear infinite reverse', top: '-40px' }}>
                <Truck className="w-16 h-16 text-yellow-400" />
              </div>
            </div>
          </div>

          {/* Ambient glow */}
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-yellow-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl animate-pulse animation-delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl"></div>
        </div>
      )}

      {/* ================= NAVBAR ================= */}
      <nav className="sticky top-0 z-50 flex justify-between items-center px-6 md:px-12 py-4 border-b border-yellow-500/20 backdrop-blur-xl bg-slate-950/80">
        <Link href="/" className="flex items-center gap-3 group">
          {/* Logo with taxi theme */}
          <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-xl flex items-center justify-center text-black font-bold text-xl shadow-lg shadow-yellow-500/30 group-hover:scale-105 transition-transform relative overflow-hidden">
            <div className="absolute inset-0 bg-black/10 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
            <Car className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Munyiri Legacy
            </span>
            <span className="text-xs text-yellow-400 font-medium tracking-wider flex items-center gap-1">
              <Navigation2 className="w-3 h-3" /> Driving Excellence, Delivering Legacy
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-8">
          <a href="#about" className="text-gray-300 hover:text-yellow-400 transition font-medium relative group">
            About
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-yellow-400 transition-all group-hover:w-full"></span>
          </a>
          <a href="#features" className="text-gray-300 hover:text-yellow-400 transition font-medium relative group">
            Features
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-yellow-400 transition-all group-hover:w-full"></span>
          </a>
          <a href="#solutions" className="text-gray-300 hover:text-yellow-400 transition font-medium relative group">
            Solutions
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-yellow-400 transition-all group-hover:w-full"></span>
          </a>
          <a href="#pricing" className="text-gray-300 hover:text-yellow-400 transition font-medium relative group">
            Pricing
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-yellow-400 transition-all group-hover:w-full"></span>
          </a>
        </div>

        <div className="flex items-center space-x-4">
          <Link
            href="/auth/login"
            className="hidden md:inline-block text-gray-300 hover:text-yellow-400 transition font-medium"
          >
            Sign In
          </Link>
          <Link
            href="/auth/signup"
            className="bg-gradient-to-r from-yellow-400 to-amber-500 px-6 py-2.5 rounded-xl text-black font-semibold hover:from-yellow-300 hover:to-amber-400 transition-all shadow-lg shadow-yellow-500/30 flex items-center gap-2"
          >
            Get Started
            <ArrowRight className="w-4 h-4" />
          </Link>
          
          {/* Mobile menu button */}
          <button 
            className="md:hidden text-gray-300"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="absolute top-20 left-0 right-0 bg-slate-900 border-b border-yellow-500/20 p-6 md:hidden backdrop-blur-xl">
            <div className="flex flex-col space-y-4">
              <a href="#about" className="text-gray-300 hover:text-yellow-400 transition py-2">About</a>
              <a href="#features" className="text-gray-300 hover:text-yellow-400 transition py-2">Features</a>
              <a href="#solutions" className="text-gray-300 hover:text-yellow-400 transition py-2">Solutions</a>
              <a href="#pricing" className="text-gray-300 hover:text-yellow-400 transition py-2">Pricing</a>
              <Link href="/auth/login" className="text-gray-300 hover:text-yellow-400 transition py-2">Sign In</Link>
            </div>
          </div>
        )}
      </nav>

      {/* ================= HERO ================= */}
      <section className="relative py-20 md:py-32 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              {/* Taxi badge */}
              <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-full px-4 py-2 mb-6">
                <Navigation2 className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-medium text-yellow-400">#1 Fleet Management in East Africa</span>
              </div>

              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
                <span className="bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-400 bg-clip-text text-transparent">
                  Smart Taxi & Fleet
                </span>
                <br />
                Management System
                <br />
                <span className="text-4xl md:text-5xl text-gray-300">For Maximum Profits</span>
              </h1>

              <p className="text-gray-400 text-lg md:text-xl max-w-xl mt-8 leading-relaxed">
                Monitor vehicle income in real-time, track expenses, manage drivers, and analyze fleet profitability — all in one intelligent platform built for transport businesses.
              </p>

              <div className="flex flex-wrap gap-4 mt-10">
                <button
                  onClick={scrollToFeatures}
                  className="group bg-gradient-to-r from-yellow-400 to-amber-500 px-8 py-4 rounded-xl text-black font-semibold hover:from-yellow-300 hover:to-amber-400 transition-all shadow-xl shadow-yellow-500/30 flex items-center gap-2 text-lg"
                >
                  Start Free Trial
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>

                <a
                  href="#features"
                  className="border border-gray-700 px-8 py-4 rounded-xl hover:bg-gray-800 transition-all flex items-center gap-2 text-lg"
                >
                  <Radio className="w-5 h-5 text-yellow-400" />
                  Live Demo
                </a>
              </div>

              {/* Live tracking indicator */}
              <div className="flex items-center gap-6 mt-12">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
                  </span>
                  <span className="text-sm text-gray-400">2,847 vehicles online now</span>
                </div>
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 border-2 border-gray-900 flex items-center justify-center text-black font-bold text-xs"
                    >
                      {['JD', 'MK', 'AT', 'SK'][i-1]}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Dashboard Preview - Taxi themed */}
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-2xl blur-xl opacity-30"></div>
              <div className="relative bg-slate-800/90 backdrop-blur-xl rounded-2xl border border-yellow-500/30 p-6 shadow-2xl">
                {/* Dashboard Header with taxi meter styling */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>
                  <div className="text-xs text-gray-400 flex items-center gap-2 bg-black/30 px-3 py-1 rounded-full">
                    <Radio className="w-3 h-3 text-yellow-400" />
                    <span>Live Tracking • 12 vehicles active</span>
                  </div>
                </div>

                {/* Taxi Meter Style KPI */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gradient-to-br from-yellow-500/10 to-amber-600/10 rounded-xl p-4 border border-yellow-500/30 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-yellow-500/5 rounded-full blur-2xl"></div>
                    <div className="flex items-center gap-2 mb-2">
                      <CircleDollarSign className="w-4 h-4 text-yellow-400" />
                      <p className="text-sm text-gray-400">Today's Income</p>
                    </div>
                    <p className="text-2xl font-bold text-white">KES 58,400</p>
                    <p className="text-xs text-yellow-400 mt-1 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> +12.3% vs yesterday
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-xl p-4 border border-blue-500/30">
                    <div className="flex items-center gap-2 mb-2">
                      <Timer className="w-4 h-4 text-blue-400" />
                      <p className="text-sm text-gray-400">Active Vehicles</p>
                    </div>
                    <p className="text-2xl font-bold text-white">24/32</p>
                    <p className="text-xs text-blue-400 mt-1">75% utilization</p>
                  </div>
                </div>

                {/* Route Map Visualization */}
                <div className="h-32 bg-slate-700/50 rounded-xl mb-6 p-4 relative overflow-hidden">
                  <div className="absolute inset-0 opacity-20">
                    <svg className="w-full h-full" viewBox="0 0 100 30">
                      <path d="M0,15 Q20,5 40,15 T80,15 T120,15" stroke="#FBBF24" strokeWidth="2" fill="none" strokeDasharray="4 4" />
                      <circle cx="20" cy="15" r="2" fill="#FBBF24" />
                      <circle cx="60" cy="15" r="2" fill="#FBBF24" />
                      <circle cx="100" cy="15" r="2" fill="#FBBF24" />
                    </svg>
                  </div>
                  <div className="relative z-10 flex items-end h-16 gap-2">
                    {[45, 62, 58, 78, 85, 72, 90].map((h, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className="w-full bg-gradient-to-t from-yellow-400 to-amber-400 rounded-t-lg transition-all hover:from-yellow-300"
                          style={{ height: `${h}%` }}
                        ></div>
                        <span className="text-[8px] text-gray-400">{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Vehicle Status Grid */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-700/50 p-3 rounded-lg border-l-4 border-yellow-400">
                    <div className="flex items-center gap-2 mb-1">
                      <Navigation2 className="w-4 h-4 text-yellow-400" />
                      <p className="text-xs text-gray-400">On Route</p>
                    </div>
                    <p className="text-lg font-semibold">18</p>
                  </div>
                  <div className="bg-slate-700/50 p-3 rounded-lg border-l-4 border-blue-400">
                    <div className="flex items-center gap-2 mb-1">
                      <ParkingCircle className="w-4 h-4 text-blue-400" />
                      <p className="text-xs text-gray-400">Idle</p>
                    </div>
                    <p className="text-lg font-semibold">6</p>
                  </div>
                  <div className="bg-slate-700/50 p-3 rounded-lg border-l-4 border-green-400">
                    <div className="flex items-center gap-2 mb-1">
                      <Wrench className="w-4 h-4 text-green-400" />
                      <p className="text-xs text-gray-400">Service</p>
                    </div>
                    <p className="text-lg font-semibold">8</p>
                  </div>
                </div>

                {/* Taxi meter style footer */}
                <div className="mt-4 pt-4 border-t border-yellow-500/20 flex justify-between items-center text-xs">
                  <span className="text-gray-500 flex items-center gap-1">
                    <FuelIcon className="w-3 h-3" /> Avg Fuel: 8.2L/100km
                  </span>
                  <span className="text-yellow-400">KES 342,800 total today</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted By Strip - Taxi Company Names */}
      <section className="border-y border-yellow-500/20 py-12 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-sm text-gray-500 mb-6 flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4 text-yellow-400" />
            Trusted by leading transport companies across East Africa
          </p>
          <div className="flex justify-center items-center gap-8 md:gap-16 flex-wrap">
            {[
              { name: 'City Hoppers', icon: '🚕' },
              { name: 'Express Taxis', icon: '🚖' },
              { name: 'Safari Cabs', icon: '🚙' },
              { name: 'Metro Shuttles', icon: '🚐' },
              { name: 'Transline', icon: '🚌' }
            ].map((company) => (
              <span key={company.name} className="text-gray-400 font-semibold text-lg hover:text-yellow-400 transition-colors flex items-center gap-2">
                <span>{company.icon}</span> {company.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ================= ABOUT ================= */}
      <section id="about" className="py-24 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-yellow-400 font-semibold text-sm uppercase tracking-wider flex items-center justify-center gap-2">
              <Navigation className="w-4 h-4" /> About MLI
            </span>
            <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6">
              Munyiri Legacy Investments
            </h2>
            <p className="text-yellow-400 text-lg mb-4 font-medium flex items-center justify-center gap-2">
              <Car className="w-5 h-5" /> "Driving Excellence, Delivering Legacy"
            </p>
            <p className="text-gray-400 text-lg max-w-3xl mx-auto leading-relaxed">
              MLI is East Africa's premier fleet management and analytics platform, designed specifically for taxi operators, matatu owners, and transport companies. We transform traditional transport operations into data-driven, scalable, and transparent business models.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mt-16">
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-500/20 to-amber-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Map className="w-8 h-8 text-yellow-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Pan-African Coverage</h3>
              <p className="text-gray-400">Serving 500+ fleet operators across Kenya, Tanzania, and Uganda</p>
            </div>
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Calendar className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">5+ Years Excellence</h3>
              <p className="text-gray-400">Proven track record since 2019 with 98% client retention</p>
            </div>
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Lock className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Bank-Level Security</h3>
              <p className="text-gray-400">Enterprise-grade encryption and 99.9% uptime guarantee</p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FEATURES ================= */}
      <section id="features" ref={featuresRef} className="py-24 px-6 bg-slate-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-yellow-400 font-semibold text-sm uppercase tracking-wider">Platform Capabilities</span>
            <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6">
              Taxi Fleet Management Features
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Everything you need to track, analyze, and optimize your taxi and transport business
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Navigation2 className="w-6 h-6" />}
              title="Real-Time GPS Tracking"
              description="Track every vehicle's location, route history, distance traveled, and idle time with live map integration."
            />
            <FeatureCard
              icon={<Wallet className="w-6 h-6" />}
              title="Income & Expense Tracking"
              description="Automatically calculate daily income, track expenses, and monitor net profit per vehicle and across your fleet."
            />
            <FeatureCard
              icon={<UserCheck className="w-6 h-6" />}
              title="Driver Performance"
              description="Monitor driver behavior, trips completed, revenue generated, and efficiency ratings to improve accountability."
            />
            <FeatureCard
              icon={<FuelIcon className="w-6 h-6" />}
              title="Fuel Management"
              description="Track fuel consumption, detect anomalies, and optimize routes to reduce fuel costs by up to 30%."
            />
            <FeatureCard
              icon={<Wrench className="w-6 h-6" />}
              title="Maintenance Alerts"
              description="Automated reminders for service due dates, insurance renewal, and compliance requirements."
            />
            <FeatureCard
              icon={<BarChart3 className="w-6 h-6" />}
              title="Profit Analytics"
              description="Comprehensive dashboards showing profitability trends, peak hours analysis, and revenue optimization insights."
            />
            <FeatureCard
              icon={<CreditCard className="w-6 h-6" />}
              title="Digital Payments"
              description="Integrate with M-Pesa and other payment platforms for seamless fare collection and reconciliation."
            />
            <FeatureCard
              icon={<Camera className="w-6 h-6" />}
              title="Dashcam Integration"
              description="Connect with onboard cameras for security footage and accident verification."
            />
            <FeatureCard
              icon={<FileSpreadsheet className="w-6 h-6" />}
              title="Automated Reports"
              description="Generate daily, weekly, and monthly reports for income, expenses, and driver performance."
            />
          </div>
        </div>
      </section>

      {/* Role-Based Access Section */}
      <section id="solutions" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-yellow-400 font-semibold text-sm uppercase tracking-wider">Tailored Access</span>
            <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6">
              Three Roles. One Platform.
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Intelligent access control for every level of your transport operation
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Admin Role */}
            <RoleCard
              icon={<Shield className="w-8 h-8" />}
              title="Administrator"
              description="Complete financial control and system oversight"
              features={[
                "Full P&L access",
                "User management",
                "System configuration",
                "Audit logs",
                "Multi-fleet overview"
              ]}
              color="from-purple-500 to-purple-600"
              buttonText="Admin Access"
            />

            {/* Fleet Manager Role */}
            <RoleCard
              icon={<Gauge className="w-8 h-8" />}
              title="Fleet Manager"
              description="Daily operations and team coordination"
              features={[
                "Live vehicle tracking",
                "Driver assignments",
                "Maintenance alerts",
                "Performance metrics",
                "Route optimization"
              ]}
              color="from-blue-500 to-blue-600"
              buttonText="Manager Access"
              highlighted
            />

            {/* Driver Role */}
            <RoleCard
              icon={<UserCircle className="w-8 h-8" />}
              title="Driver Portal"
              description="Personal dashboard for each driver"
              features={[
                "Trip logging",
                "Expense submission",
                "Earnings tracking",
                "Vehicle status",
                "Shift scheduling"
              ]}
              color="from-yellow-400 to-amber-500"
              buttonText="Driver Login"
            />
          </div>

          {/* Access Flow Explanation */}
          <div className="mt-16 bg-slate-800/50 backdrop-blur-xl rounded-2xl p-8 border border-yellow-500/20">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                  <KeyRound className="w-6 h-6 text-yellow-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Secure Multi-Role Access</h3>
                  <p className="text-sm text-gray-400">Admins onboard manually · Managers get invites · Drivers registered by admins</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                    <UserCog className="w-5 h-5 text-purple-400" />
                  </div>
                  <p className="text-xs font-medium">Admin</p>
                  <p className="text-xs text-gray-500">Manual setup</p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-600" />
                <div className="text-center">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Users className="w-5 h-5 text-blue-400" />
                  </div>
                  <p className="text-xs font-medium">Manager</p>
                  <p className="text-xs text-gray-500">Invite only</p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-600" />
                <div className="text-center">
                  <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                    <UserCircle className="w-5 h-5 text-yellow-400" />
                  </div>
                  <p className="text-xs font-medium">Driver</p>
                  <p className="text-xs text-gray-500">Admin created</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section - Taxi Metrics */}
      <section className="py-16 bg-gradient-to-r from-yellow-600/20 to-amber-600/20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="p-6 border border-yellow-500/20 rounded-xl bg-slate-900/50">
              <Car className="w-8 h-8 text-yellow-400 mx-auto mb-3" />
              <p className="text-4xl font-bold text-white">500+</p>
              <p className="text-gray-400">Fleets Managed</p>
            </div>
            <div className="p-6 border border-yellow-500/20 rounded-xl bg-slate-900/50">
              <Route className="w-8 h-8 text-yellow-400 mx-auto mb-3" />
              <p className="text-4xl font-bold text-white">10k+</p>
              <p className="text-gray-400">Vehicles Tracked</p>
            </div>
            <div className="p-6 border border-yellow-500/20 rounded-xl bg-slate-900/50">
              <TrendingUp className="w-8 h-8 text-yellow-400 mx-auto mb-3" />
              <p className="text-4xl font-bold text-white">98%</p>
              <p className="text-gray-400">Client Retention</p>
            </div>
            <div className="p-6 border border-yellow-500/20 rounded-xl bg-slate-900/50">
              <Phone className="w-8 h-8 text-yellow-400 mx-auto mb-3" />
              <p className="text-4xl font-bold text-white">24/7</p>
              <p className="text-gray-400">Support</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-yellow-400 font-semibold text-sm uppercase tracking-wider">Testimonials</span>
            <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6">
              What Fleet Owners Say
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: "James Mwangi",
                role: "City Hoppers Taxis",
                quote: "MLI transformed our taxi business. We've reduced fuel costs by 25% and increased driver accountability significantly.",
                rating: 5
              },
              {
                name: "Sarah Akinyi",
                role: "Metro Shuttles",
                quote: "The real-time tracking and automated reports save me 20 hours of manual work every week. Best investment we've made.",
                rating: 5
              },
              {
                name: "David Omondi",
                role: "Express Cabs Ltd",
                quote: "Since implementing MLI, our fleet utilization has increased by 40%. The driver performance metrics are game-changing.",
                rating: 5
              }
            ].map((testimonial, i) => (
              <div key={i} className="bg-slate-800/50 border border-yellow-500/20 rounded-xl p-6 hover:border-yellow-400 transition-all">
                <div className="flex items-center gap-2 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <span key={i} className="text-yellow-400">★</span>
                  ))}
                </div>
                <p className="text-gray-300 mb-4">"{testimonial.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center text-black font-bold">
                    {testimonial.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold">{testimonial.name}</p>
                    <p className="text-xs text-gray-500">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= CTA ================= */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-600/20 to-amber-600/20 blur-3xl"></div>
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-xl flex items-center justify-center text-black font-bold text-2xl shadow-lg shadow-yellow-500/30">
              <Car className="w-8 h-8" />
            </div>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Ready to Transform Your Fleet?
          </h2>
          <p className="text-yellow-400 text-lg mb-2 font-medium flex items-center justify-center gap-2">
            <Navigation2 className="w-5 h-5" /> Driving Excellence, Delivering Legacy
          </p>
          <p className="text-gray-400 text-lg mb-10 max-w-2xl mx-auto">
            Join 500+ transport owners who've gained complete control of their finances and operations
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/auth/signup"
              className="group bg-gradient-to-r from-yellow-400 to-amber-500 px-8 py-4 rounded-xl text-black font-semibold hover:from-yellow-300 hover:to-amber-400 transition-all shadow-xl shadow-yellow-500/30 flex items-center gap-2 text-lg"
            >
              Start Your Free Trial
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/auth/login"
              className="border border-gray-700 px-8 py-4 rounded-xl hover:bg-gray-800 transition-all text-lg flex items-center gap-2"
            >
              <Radio className="w-5 h-5 text-yellow-400" />
              Live Demo
            </Link>
          </div>
          <div className="flex items-center justify-center gap-4 mt-6 text-sm text-gray-500">
            <span>✓ No credit card required</span>
            <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
            <span>✓ Free 14-day trial</span>
            <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
            <span>✓ Cancel anytime</span>
          </div>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="border-t border-yellow-500/20 py-12 px-6 bg-slate-950">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-lg flex items-center justify-center text-black font-bold">
                  <Car className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold">Munyiri Legacy Investments</span>
                  <span className="text-xs text-yellow-400 flex items-center gap-1">
                    <Navigation2 className="w-3 h-3" /> Driving Excellence, Delivering Legacy
                  </span>
                </div>
              </div>
              <p className="text-gray-500 text-sm max-w-md">
                Complete fleet management platform for modern taxi and transport businesses. Track, analyze, and optimize your operations in real-time.
              </p>
              <div className="flex items-center gap-4 mt-4">
                <a href="#" className="text-gray-500 hover:text-yellow-400 transition">
                  <Phone className="w-4 h-4" />
                </a>
                <a href="#" className="text-gray-500 hover:text-yellow-400 transition">
                  <Mail className="w-4 h-4" />
                </a>
                <a href="#" className="text-gray-500 hover:text-yellow-400 transition">
                  <MapPin className="w-4 h-4" />
                </a>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="#features" className="hover:text-yellow-400">Features</a></li>
                <li><a href="#pricing" className="hover:text-yellow-400">Pricing</a></li>
                <li><a href="#" className="hover:text-yellow-400">Security</a></li>
                <li><a href="#" className="hover:text-yellow-400">API</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="#about" className="hover:text-yellow-400">About</a></li>
                <li><a href="#" className="hover:text-yellow-400">Blog</a></li>
                <li><a href="#" className="hover:text-yellow-400">Careers</a></li>
                <li><a href="#" className="hover:text-yellow-400">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-yellow-500/20 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
            <div className="mb-4 md:mb-0">
              © {new Date().getFullYear()} Munyiri Legacy Investments. All rights reserved.
            </div>
            <div className="flex space-x-6">
              <a href="#" className="hover:text-yellow-400">Privacy Policy</a>
              <a href="#" className="hover:text-yellow-400">Terms of Service</a>
              <a href="#" className="hover:text-yellow-400">Cookie Policy</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Add animation styles */}
      <style jsx>{`
        @keyframes moveRoad {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        
        @keyframes moveTaxi {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100vw);
          }
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
      `}</style>
    </div>
  );
}

// Helper Components with fixed Tailwind classes
const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
  <div className="group p-8 bg-slate-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl hover:border-yellow-500/50 hover:shadow-xl hover:shadow-yellow-500/10 transition-all">
    <div className="w-14 h-14 bg-gradient-to-br from-yellow-500/20 to-amber-600/20 rounded-xl flex items-center justify-center text-yellow-400 mb-5 group-hover:scale-110 group-hover:from-yellow-500/30 group-hover:to-amber-600/30 transition-all">
      {icon}
    </div>
    <h3 className="text-xl font-semibold mb-3 group-hover:text-yellow-400 transition-colors">{title}</h3>
    <p className="text-gray-400 leading-relaxed">{description}</p>
  </div>
);

const RoleCard = ({
  icon,
  title,
  description,
  features,
  color,
  buttonText,
  highlighted = false
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  features: string[];
  color: string;
  buttonText: string;
  highlighted?: boolean;
}) => (
  <div className={`relative bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border ${highlighted ? 'border-yellow-500/50 shadow-xl shadow-yellow-500/10' : 'border-gray-700'} hover:border-yellow-500/50 transition-all`}>
    {highlighted && (
      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-amber-500 text-black text-xs font-semibold px-3 py-1 rounded-full">
        Most Popular
      </div>
    )}
    <div className={`w-16 h-16 bg-gradient-to-br ${color} rounded-xl flex items-center justify-center text-white mb-5 shadow-lg`}>
      {icon}
    </div>
    <h3 className="text-2xl font-bold mb-2">{title}</h3>
    <p className="text-gray-400 text-sm mb-6">{description}</p>
    <ul className="space-y-3 mb-8">
      {features.map((feature, i) => (
        <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
          <CheckCircle className="w-4 h-4 text-yellow-400 shrink-0" />
          {feature}
        </li>
      ))}
    </ul>
    <Link
      href="/auth/login"
      className={`block w-full text-center bg-gradient-to-r ${color} text-white py-3 rounded-xl font-semibold hover:opacity-90 transition-all`}
    >
      {buttonText}
    </Link>
  </div>
);