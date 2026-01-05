import { Link, useLocation } from "wouter";
import { 
  Globe, 
  TrendingUp, 
  Shield, 
  Clock, 
  CreditCard, 
  Languages, 
  Wallet, 
  LineChart,
  Package,
  CheckCircle2,
  Award,
  Users,
  ArrowRight,
  Store,
  Zap,
  Download,
  DollarSign,
  RefreshCw,
  Sparkles
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { PackageTracking } from "@/components/package-tracking";
// import { MarketingBannerSlider } from "@/components/marketing-banner-slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LanguageSwitcher, MiniLanguageSwitcher } from "@/components/language-switcher";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import moogshipLogo from "@/assets/moogship-logo.png.jpeg";

// Feature data
const features = [
  {
    title: "Global Shipping Network",
    description: "Connect with shipping partners worldwide through our integrated network of verified carriers and logistics providers.",
    icon: Globe
  },
  {
    title: "Intelligent Rate Optimization",
    description: "Our advanced algorithms find the best shipping rates in real-time, saving you money on every shipment.",
    icon: TrendingUp
  },
  {
    title: "Multi-Currency Support",
    description: "Handle transactions in multiple currencies with automatic exchange rate calculations and transparent pricing.",
    icon: Wallet
  },
  {
    title: "Comprehensive Tracking",
    description: "End-to-end shipment visibility with detailed status updates and estimated delivery times.",
    icon: Package
  },
  {
    title: "Secure Transaction Processing",
    description: "Enterprise-grade security protocols protect your payment information and sensitive shipping data.",
    icon: Shield
  },
  {
    title: "Streamlined Documentation",
    description: "Automated customs forms and shipping documentation generation with international compliance built-in.",
    icon: CheckCircle2
  },
  {
    title: "Real-Time Analytics",
    description: "Detailed reports and insights on shipping performance, costs, and optimization opportunities.",
    icon: LineChart
  },
  {
    title: "24/7 Customer Support",
    description: "Our dedicated support team is available around the clock to address any shipping concerns.",
    icon: Clock
  }
];

// Testimonial data
const testimonials = [
  {
    quote: "Moogship has transformed our international logistics operations. We've seen a 35% reduction in shipping costs while improving delivery times.",
    author: "Sarah Johnson",
    position: "Supply Chain Director, TechInnovate"
  },
  {
    quote: "The multi-currency support and transparent pricing has made expanding our e-commerce business to new markets seamless and profitable.",
    author: "Michael Chen",
    position: "CEO, Global Retail Solutions"
  },
  {
    quote: "After switching to Moogship, we've eliminated paperwork headaches with their automated documentation system. A game-changer for our export business.",
    author: "Ana Rodriguez",
    position: "Operations Manager, Worldwide Exports"
  }
];

export default function Marketing() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();

  const handleAuthClick = () => {
    setLocation('/auth');
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100">
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="mb-16 py-4 border-b border-blue-100">
            {/* Logo and Brand */}
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <img src={moogshipLogo} alt="Moogship Logo" className="h-12 w-auto" />
                <span className="ml-3 text-xl font-bold text-blue-600">MoogShip</span>
              </div>
              
              {/* Desktop Menu */}
              <div className="hidden md:flex items-center space-x-8">
                {/* Navigation Links */}
                <div className="flex space-x-6">
                  <a 
                    href="#features" 
                    className="inline-block py-2 px-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    {t('marketing.navigation.features')}
                  </a>
                  <a 
                    href="#benefits" 
                    className="inline-block py-2 px-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('benefits')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    {t('marketing.navigation.benefits')}
                  </a>
                  <a 
                    href="#testimonials" 
                    className="inline-block py-2 px-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('testimonials')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    {t('marketing.navigation.testimonials')}
                  </a>
                  <a 
                    href="#pricing" 
                    className="inline-block py-2 px-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    {t('marketing.navigation.pricing')}
                  </a>
                </div>
                
                {/* Language Switcher */}
                <div className="mr-2">
                  <MiniLanguageSwitcher />
                </div>
                
                {/* Get Started Button */}
                <button
                  onClick={handleAuthClick}
                  className="inline-block py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
                >
                  {t('marketing.hero.startShipping', 'Start Shipping')}
                </button>
              </div>

              {/* Mobile Menu */}
              <div className="md:hidden flex items-center space-x-3">
                <MiniLanguageSwitcher />
                <button
                  onClick={handleAuthClick}
                  className="inline-block py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
                >
                  {t('marketing.hero.startShipping', 'Start Shipping')}
                </button>
              </div>
            </div>
          </div>
          
          {/* Marketing Banner Slider - Temporarily Disabled */}
          {/* <MarketingBannerSlider /> */}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 mb-6"
                  dangerouslySetInnerHTML={{ __html: t('marketing.hero.title') }}>
              </h1>
              <p className="text-lg md:text-xl text-gray-600 mb-4">
                {t('marketing.hero.subtitle')}
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-semibold mb-6">
                <Sparkles className="w-4 h-4" />
                <span>NEW: Etsy Integration - Automate your entire shipping workflow!</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleAuthClick}
                  className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg text-lg font-medium text-center w-full sm:w-auto transition-colors"
                >
                  {t('marketing.hero.startShipping', 'Start Shipping')}
                </button>
                <a 
                  href="#features"
                  className="inline-block border border-blue-300 text-blue-600 hover:bg-blue-50 px-6 py-3 rounded-lg text-lg font-medium text-center w-full sm:w-auto transition-colors"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  {t('marketing.hero.learnMore')}
                </a>
              </div>
              
              <div className="mt-10 flex items-center space-x-6">
                <div className="flex -space-x-2">
                  <div className="w-10 h-10 rounded-full bg-blue-300 border-2 border-white flex items-center justify-center text-white text-xs font-medium">A</div>
                  <div className="w-10 h-10 rounded-full bg-blue-400 border-2 border-white flex items-center justify-center text-white text-xs font-medium">B</div>
                  <div className="w-10 h-10 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center text-white text-xs font-medium">C</div>
                  <div className="w-10 h-10 rounded-full bg-blue-600 border-2 border-white flex items-center justify-center text-white text-xs font-medium">D</div>
                </div>
                <p className="text-sm text-gray-600"
                   dangerouslySetInnerHTML={{ __html: t('marketing.hero.trustedBy') }}>
                </p>
              </div>
            </div>
            
            <div className="hidden md:block relative">
              <div className="absolute -right-20 -top-20 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-2xl opacity-20"></div>
              <div className="absolute -left-20 -bottom-20 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-2xl opacity-20"></div>
              <div className="relative bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                <div className="p-6 bg-blue-50 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  </div>
                  <div className="text-sm font-medium text-gray-600">MoogShip Dashboard</div>
                </div>
                <div className="p-8 grid gap-4">
                  <div className="rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4">
                    <div className="text-xs font-medium mb-1 opacity-80">Current Balance</div>
                    <div className="text-2xl font-bold">$1,458.20</div>
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-xs opacity-80">Available for shipping</span>
                      <span className="flex items-center text-xs font-medium bg-white/20 px-2 py-1 rounded-full">
                        <TrendingUp className="h-3 w-3 mr-1" /> 12.5%
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg bg-blue-50 p-4">
                      <div className="text-xs font-medium mb-1 text-blue-600">Shipments</div>
                      <div className="text-xl font-bold text-gray-900">248</div>
                      <div className="text-xs text-gray-500 mt-1">This month</div>
                    </div>
                    <div className="rounded-lg bg-green-50 p-4">
                      <div className="text-xs font-medium mb-1 text-green-600">Savings</div>
                      <div className="text-xl font-bold text-gray-900">$3,245</div>
                      <div className="text-xs text-gray-500 mt-1">vs market rates</div>
                    </div>
                  </div>
                  
                  <div className="rounded-lg bg-gray-50 p-4">
                    <div className="text-xs font-medium mb-3 text-gray-600">Recent Activity</div>
                    {[1, 2, 3].map((item) => (
                      <div key={item} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <div className="flex items-center">
                          <Package className="h-4 w-4 text-blue-500 mr-2" />
                          <div className="text-xs">Shipment #8873{item}</div>
                        </div>
                        <div className="text-xs font-medium">$78.5{item}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent"></div>
      </section>
      
      {/* Featured: Etsy Integration Section */}
      <section className="py-20 bg-gradient-to-r from-orange-50 to-blue-50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-4">
            <span className="inline-block px-4 py-2 bg-orange-100 text-orange-600 rounded-full text-sm font-semibold mb-4">
              <Sparkles className="w-4 h-4 inline mr-2" />
              NEW INTEGRATION
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Supercharge Your Etsy Store with MoogShip
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-10">
              Connect your Etsy store and automate your entire shipping workflow. Save time, reduce costs, and delight your customers with our powerful Etsy Integration.
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-14 w-14 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 text-white">
                    <Store className="h-7 w-7" />
                  </div>
                </div>
                <div className="ml-5">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Seamless Order Import</h3>
                  <p className="text-gray-600">
                    Automatically import all your Etsy orders with a single click. No manual data entry, no copy-paste errors. Your orders sync in real-time.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-14 w-14 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 text-white">
                    <Zap className="h-7 w-7" />
                  </div>
                </div>
                <div className="ml-5">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Bulk Shipping Actions</h3>
                  <p className="text-gray-600">
                    Process multiple orders at once. Set customs values, GTIP codes, and package dimensions for all your orders in seconds.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-14 w-14 rounded-xl bg-gradient-to-br from-green-400 to-green-600 text-white">
                    <DollarSign className="h-7 w-7" />
                  </div>
                </div>
                <div className="ml-5">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Instant Price Calculation</h3>
                  <p className="text-gray-600">
                    Get real-time shipping quotes for all your Etsy orders. Compare carriers and choose the most cost-effective option for each shipment.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-14 w-14 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 text-white">
                    <RefreshCw className="h-7 w-7" />
                  </div>
                </div>
                <div className="ml-5">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Automated Workflow</h3>
                  <p className="text-gray-600">
                    From order import to label printing, automate your entire shipping process. Save hours every week and focus on growing your business.
                  </p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link href="/etsy-integration">
                  <Button size="lg" className="bg-orange-600 hover:bg-orange-700 text-white font-semibold px-8 py-6 text-lg">
                    <Store className="mr-2 h-5 w-5" />
                    Connect Your Etsy Store
                  </Button>
                </Link>
                <Link href="/auth">
                  <Button size="lg" variant="outline" className="border-2 border-gray-300 hover:bg-gray-50 font-semibold px-8 py-6 text-lg">
                    View Demo
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-100 to-blue-100 rounded-2xl transform rotate-3"></div>
              <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
                <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Store className="h-6 w-6 text-white" />
                      <span className="text-white font-semibold">Etsy Integration Dashboard</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                      <span className="text-white text-sm">Connected</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-6 space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-600">Orders Imported Today</span>
                      <span className="text-2xl font-bold text-gray-900">47</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-gradient-to-r from-orange-500 to-orange-600 h-2 rounded-full" style={{width: '75%'}}></div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                      <Package className="h-6 w-6 text-blue-600 mb-2" />
                      <div className="text-2xl font-bold text-gray-900">234</div>
                      <div className="text-xs text-gray-600">Orders This Month</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                      <DollarSign className="h-6 w-6 text-green-600 mb-2" />
                      <div className="text-2xl font-bold text-gray-900">$892</div>
                      <div className="text-xs text-gray-600">Saved on Shipping</div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                      <div className="flex items-center space-x-3">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <span className="text-sm font-medium">Order #ET-2024-892</span>
                      </div>
                      <span className="text-sm text-gray-500">Processing</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                      <div className="flex items-center space-x-3">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <span className="text-sm font-medium">Order #ET-2024-891</span>
                      </div>
                      <span className="text-sm text-gray-500">Shipped</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                      <div className="flex items-center space-x-3">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <span className="text-sm font-medium">Order #ET-2024-890</span>
                      </div>
                      <span className="text-sm text-gray-500">Delivered</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Tracking Section */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('marketing.tracking.title')}</h2>
            <p className="text-lg text-gray-600">
              {t('marketing.tracking.subtitle')}
            </p>
          </div>
          
          <div className="mb-10">
            <PackageTracking />
          </div>
        </div>
      </section>
      
      {/* Partners Logo Section */}
      <section className="py-12 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <p className="text-sm font-medium text-blue-600 mb-2">{t('marketing.partners.title')}</p>
            <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-8">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-8 w-32 bg-gray-200 rounded-md flex items-center justify-center">
                  <span className="text-gray-500 font-medium text-sm">PARTNER {i+1}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Powerful Features for Global Shipping</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Our platform combines advanced technology with logistics expertise to streamline your international shipping operations.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <CardTitle className="text-xl font-semibold">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
      
      {/* Benefits Section */}
      <section id="benefits" className="py-20 bg-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Why Choose MoogShip?</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Our platform was built to solve the complex challenges of international shipping and logistics management.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-8 shadow-sm">
              <Award className="h-12 w-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-bold mb-3">Quality & Reliability</h3>
              <p className="text-gray-600 mb-4">
                Vetted carrier network with performance monitoring ensures consistent, high-quality service for every shipment.
              </p>
              <ul className="space-y-2">
                {['99.7% on-time delivery', 'Real-time tracking updates', 'Proactive issue resolution'].map((item, i) => (
                  <li key={i} className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-600">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="bg-white rounded-xl p-8 shadow-sm">
              <TrendingUp className="h-12 w-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-bold mb-3">Cost Efficiency</h3>
              <p className="text-gray-600 mb-4">
                Save on every shipment with our volume-based discounts and intelligent routing algorithms.
              </p>
              <ul className="space-y-2">
                {['Up to 30% savings on shipping costs', 'Transparent pricing with no hidden fees', 'Volume-based discounts'].map((item, i) => (
                  <li key={i} className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-600">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="bg-white rounded-xl p-8 shadow-sm">
              <Users className="h-12 w-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-bold mb-3">Unparalleled Support</h3>
              <p className="text-gray-600 mb-4">
                Our logistics experts provide personalized guidance and support for all your shipping needs.
              </p>
              <ul className="space-y-2">
                {['24/7 customer service', 'Dedicated account managers', 'Expert customs guidance'].map((item, i) => (
                  <li key={i} className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-600">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
      
      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">What Our Customers Say</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Businesses around the world trust MoogShip for their global shipping needs.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border border-gray-100 shadow-sm">
                <CardContent className="pt-8">
                  <div className="mb-6 flex items-center justify-center">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="h-5 w-5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.8-2.034c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <blockquote className="text-center mb-6 italic text-gray-600">
                    "{testimonial.quote}"
                  </blockquote>
                  <div className="text-center">
                    <p className="font-semibold text-gray-900">{testimonial.author}</p>
                    <p className="text-sm text-gray-500">{testimonial.position}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
      
      {/* E-commerce Platforms Section */}
      <section id="platforms" className="py-20 bg-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Built for E-commerce Success</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto mb-4">
              Seamlessly integrate with your favorite marketplaces to streamline your shipping operations and reduce costs.
            </p>
            <p className="text-lg font-semibold text-orange-600">
              ⭐ Now featuring advanced Etsy Integration - Import, calculate, and ship all your orders in minutes!
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Amazon */}
            <Card className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-2 flex flex-col items-center text-center">
                <div className="w-44 h-16 mb-4 flex items-center justify-center">
                  <img src="/logos/amazon.png" alt="Amazon Logo" className="h-8 object-contain" />
                </div>
                <CardTitle className="text-xl font-semibold">Amazon Sellers</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-600 mb-4">Optimize your FBA shipments and direct customer fulfillment with our specialized Amazon seller solutions.</p>
                <div className="mt-2 flex justify-center">
                  <ul className="text-left space-y-2">
                    <li className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-600">FBA preparation services</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-600">Amazon-compliant labeling</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
            
            {/* Etsy - Enhanced Featured Card */}
            <Card className="border-2 border-orange-400 shadow-xl hover:shadow-2xl transition-all relative overflow-hidden bg-gradient-to-br from-orange-50 to-white">
              <div className="absolute top-0 right-0 px-3 py-1 bg-orange-500 text-white text-xs font-bold rounded-bl-lg">
                FEATURED
              </div>
              <CardHeader className="pb-2 flex flex-col items-center text-center">
                <div className="w-44 h-16 mb-4 flex items-center justify-center">
                  <Store className="h-10 w-10 text-orange-500" />
                </div>
                <CardTitle className="text-xl font-semibold">Etsy Sellers</CardTitle>
                <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-200 mt-2">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Advanced Integration Available
                </Badge>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-600 mb-4">Transform your Etsy shipping with our powerful integration. Import orders, calculate prices, and ship in bulk!</p>
                <div className="mt-2 space-y-2">
                  <ul className="text-left space-y-2">
                    <li className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-600 font-medium">One-click order import</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-600 font-medium">Bulk shipping management</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-600 font-medium">Real-time price calculation</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-600 font-medium">Automated customs forms</span>
                    </li>
                  </ul>
                </div>
                <Link href="/etsy-integration">
                  <Button className="mt-4 w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold">
                    <Store className="mr-2 h-4 w-4" />
                    Connect Etsy Store
                  </Button>
                </Link>
              </CardContent>
            </Card>
            
            {/* Walmart */}
            <Card className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-2 flex flex-col items-center text-center">
                <div className="w-44 h-16 mb-4 flex items-center justify-center">
                  <img src="/logos/walmart.png" alt="Walmart Logo" className="h-8 object-contain" />
                </div>
                <CardTitle className="text-xl font-semibold">Walmart Sellers</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-600 mb-4">Meet Walmart's delivery requirements with our dedicated solutions for marketplace sellers.</p>
                <div className="mt-2 flex justify-center">
                  <ul className="text-left space-y-2">
                    <li className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-600">Walmart fulfillment support</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-600">Competitive delivery timelines</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
            
            {/* Wayfair */}
            <Card className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-2 flex flex-col items-center text-center">
                <div className="w-44 h-16 mb-4 flex items-center justify-center">
                  <div className="text-[#7C1836] font-bold text-2xl">Wayfair</div>
                </div>
                <CardTitle className="text-xl font-semibold">Wayfair Sellers</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-600 mb-4">Efficiently ship furniture and home goods with our specialized large item shipping solutions.</p>
                <div className="mt-2 flex justify-center">
                  <ul className="text-left space-y-2">
                    <li className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-600">Large item expertise</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-600">White glove delivery options</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      
      {/* App Screenshots Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Powerful Shipping Platform</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our user-friendly dashboard provides everything you need to manage your global shipments efficiently.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
              <div className="aspect-video overflow-hidden bg-gray-100">
                <img 
                  src="/screenshots/dashboard.png" 
                  alt="MoogShip Dashboard" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-5">
                <h3 className="text-xl font-semibold mb-2">Intuitive Dashboard</h3>
                <p className="text-gray-600">
                  Get a complete overview of all your shipments, balances, and account information in one place.
                </p>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
              <div className="aspect-video overflow-hidden bg-gray-100">
                <img 
                  src="/screenshots/shipment.png" 
                  alt="Shipment Management" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-5">
                <h3 className="text-xl font-semibold mb-2">Shipment Management</h3>
                <p className="text-gray-600">
                  Create, track, and manage all your shipments with our comprehensive shipment tools.
                </p>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
              <div className="aspect-video overflow-hidden bg-gray-100">
                <img 
                  src="/screenshots/pricing.png" 
                  alt="Real-Time Pricing" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-5">
                <h3 className="text-xl font-semibold mb-2">Real-Time Pricing</h3>
                <p className="text-gray-600">
                  Get instant price quotes based on dimensions, weight, and destination to make informed decisions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section id="pricing" className="py-20 bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Ready to Reduce Your Shipping Costs?</h2>
          <p className="text-xl text-blue-100 mb-10 max-w-3xl mx-auto">
            Join Amazon, Etsy, Walmart, and Wayfair sellers who save on every shipment with MoogShip's exclusive rates.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <a 
              href="/auth"
              className="inline-block bg-white text-blue-600 hover:bg-blue-50 px-8 py-3 text-lg font-medium rounded-lg transition-colors"
            >
              {t('marketing.cta.getStarted')}
            </a>
            <a 
              href="/calculate-price"
              className="inline-block border border-blue-300 text-white hover:bg-blue-500 px-8 py-3 text-lg font-medium rounded-lg transition-colors"
            >
              {t('marketing.cta.getQuote')}
            </a>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center mb-4">
                <img src={moogshipLogo} alt="Moogship Logo" className="h-10 w-auto bg-white p-1 rounded" />
                <span className="ml-3 text-xl font-bold">MoogShip</span>
              </div>
              <p className="text-gray-400 mb-4">
                Global shipping logistics platform for businesses of all sizes.
              </p>
              <div className="flex space-x-4">
                {['facebook', 'twitter', 'linkedin', 'instagram'].map((social) => (
                  <a key={social} href={`https://www.${social}.com/moogship`} className="text-gray-400 hover:text-white">
                    <span className="sr-only">{social}</span>
                    <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center">
                      <span className="text-sm">{social[0].toUpperCase()}</span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-4">Company</h3>
              <ul className="space-y-2">
                {['About Us', 'Careers', 'Press', 'News', 'Contact'].map((item) => (
                  <li key={item}>
                    <a href="/about" className="text-gray-400 hover:text-white">{item}</a>
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-4">Services</h3>
              <ul className="space-y-2">
                {['Global Shipping', 'Customs Clearance', 'Freight Forwarding', 'Warehousing', 'Supply Chain'].map((item) => (
                  <li key={item}>
                    <a href="/services" className="text-gray-400 hover:text-white">{item}</a>
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-4">Legal</h3>
              <ul className="space-y-2">
                {['Terms of Service', 'Privacy Policy', 'Cookie Policy', 'GDPR', 'Shipping Regulations'].map((item) => (
                  <li key={item}>
                    <a href="/legal" className="text-gray-400 hover:text-white">{item}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">&copy; 2025 MoogShip. All rights reserved.</p>
            <div className="mt-4 md:mt-0 flex space-x-4">
              <a href="/legal/terms" className="text-gray-400 hover:text-white text-sm">Terms</a>
              <a href="/legal/privacy" className="text-gray-400 hover:text-white text-sm">Privacy</a>
              <a href="/legal/cookies" className="text-gray-400 hover:text-white text-sm">Cookies</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}