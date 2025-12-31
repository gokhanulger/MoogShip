import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Search, 
  Package, 
  Truck, 
  MapPin, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Eye,
  Copy
} from 'lucide-react';
import { SharedMarketingLayout } from '../components/shared-marketing-layout';

export default function TrackingPage() {
  const { t, i18n } = useTranslation();
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingResult, setTrackingResult] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');

  // Auto-search when tracking number is provided in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const trackParam = urlParams.get('track');
    if (trackParam) {
      setTrackingNumber(trackParam);
      handleTrackingSearch(trackParam);
    }
  }, []);

  const handleTrackingSearch = async (searchNumber?: string) => {
    const numberToSearch = searchNumber || trackingNumber;
    if (!numberToSearch.trim()) {
      setError(t('tracking.error.empty', 'Lütfen takip numarası girin'));
      return;
    }

    setIsSearching(true);
    setError('');
    setTrackingResult(null);

    try {
      // Call real tracking API
      const response = await fetch(`/api/track/${encodeURIComponent(numberToSearch.trim())}`);
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        setError(data.message || t('tracking.error.notFound', 'Takip numarası bulunamadı'));
        return;
      }
      
      // Transform API response to match UI expectations
      const trackingData = data.data;
      
      // Clean up service name to remove all technical codes
      const cleanServiceName = (serviceName: string): string => {
        if (!serviceName) return 'Standard';
        
        // Remove all technical prefixes and convert to user-friendly names
        const cleanCode = serviceName.replace(/^(shipentegra|afs|se)[-_]?/i, "");
        
        // Map common service patterns to branded names
        if (cleanCode.includes('ups-express') || cleanCode.includes('ups-ekspress')) return 'MoogShip UPS Express';
        if (cleanCode.includes('ups')) return 'MoogShip UPS';
        if (cleanCode.includes('fedex')) return 'MoogShip FedEx';
        if (cleanCode.includes('dhl')) return 'MoogShip DHL';
        if (cleanCode.includes('aramex')) return 'MoogShip Aramex';
        if (cleanCode.includes('eco') || cleanCode.includes('eko')) return 'MoogShip Eco';
        if (cleanCode.includes('express')) return 'MoogShip Express';
        if (cleanCode.includes('standard')) return 'MoogShip Standard';
        
        // Clean up any remaining codes and capitalize
        return cleanCode
          .replace(/-/g, ' ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ') || 'MoogShip Service';
      };
      
      const result = {
        trackingNumber: trackingData.trackingNumber,
        status: trackingData.status,
        statusText: trackingData.statusText,
        estimatedDelivery: trackingData.estimatedDelivery,
        currentLocation: trackingData.currentLocation,
        origin: trackingData.origin,
        destination: trackingData.destination,
        carrier: trackingData.carrierInfo?.name || 'Unknown Carrier',
        service: cleanServiceName(trackingData.carrierInfo?.service || 'Standard'),
        carrierTrackingNumber: trackingData.carrierInfo?.trackingNumber,
        packageWeight: trackingData.packageInfo?.weight,
        packageDimensions: trackingData.packageInfo?.dimensions,
        packageContents: trackingData.packageInfo?.contents,
        declaredValue: trackingData.packageInfo?.declaredValue,
        senderName: trackingData.sender?.name,
        senderAddress: trackingData.sender?.address,
        receiverName: trackingData.receiver?.name,
        receiverCity: trackingData.receiver?.city,
        receiverCountry: trackingData.receiver?.country,
        timeline: trackingData.timeline || []
      };
      
      setTrackingResult(result);
    } catch (err) {
      console.error('Tracking search error:', err);
      setError(t('tracking.error.system', 'Sistem hatası oluştu, lütfen tekrar deneyin'));
    } finally {
      setIsSearching(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'in_transit': return <Truck className="w-5 h-5 text-blue-600" />;
      case 'shipped': return <Package className="w-5 h-5 text-orange-600" />;
      default: return <AlertCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'in_transit': return 'bg-blue-100 text-blue-800';
      case 'shipped': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const copyTrackingLink = () => {
    const trackingUrl = `${window.location.origin}/takip?track=${encodeURIComponent(trackingResult.trackingNumber)}`;
    navigator.clipboard.writeText(trackingUrl);
    alert(t('tracking.link.copied', 'Takip linki panoya kopyalandı!'));
  };

  return (
    <SharedMarketingLayout>
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              {i18n.language === 'tr' ? 'Kargo Takip' : 'Package Tracking'}
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 max-w-3xl mx-auto leading-relaxed">
              {i18n.language === 'tr' 
                ? 'Paketinizin konumunu gerçek zamanlı olarak takip edin. Takip numaranızı girerek anlık durum bilgisi alın.'
                : 'Track your package location in real-time. Enter your tracking number to get instant status updates.'}
            </p>
          </div>
        </div>
      </div>

      {/* Tracking Search */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-center flex items-center justify-center gap-2">
              <Search className="w-6 h-6" />
              {i18n.language === 'tr' ? 'Takip Numarası Sorgula' : 'Search Tracking Number'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <Input
                placeholder={i18n.language === 'tr' 
                  ? 'Takip numaranızı girin (örn: 1Z999AA1234567890)'
                  : 'Enter your tracking number (e.g., 1Z999AA1234567890)'}
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleTrackingSearch()}
                className="flex-1"
              />
              <Button 
                onClick={() => handleTrackingSearch()}
                disabled={isSearching}
                className="bg-blue-600 hover:bg-blue-700 px-8"
              >
                {isSearching ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {i18n.language === 'tr' ? 'Sorgulanıyor...' : 'Searching...'}
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    {i18n.language === 'tr' ? 'Takip Et' : 'Track'}
                  </>
                )}
              </Button>
            </div>

            {error && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Tracking Results */}
        {trackingResult && (
          <div className="mt-8 space-y-6">
            {/* Package Overview */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="w-6 h-6" />
                    {i18n.language === 'tr' ? 'Paket Bilgileri' : 'Package Information'}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyTrackingLink}
                    className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    {i18n.language === 'tr' ? 'Linki Kopyala' : 'Copy Link'}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{i18n.language === 'tr' ? 'Takip Numarası' : 'Tracking Number'}</p>
                    <p className="font-bold text-gray-900">{trackingResult.trackingNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{i18n.language === 'tr' ? 'Durum' : 'Status'}</p>
                    <Badge className={getStatusColor(trackingResult.status)}>
                      {trackingResult.statusText}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{i18n.language === 'tr' ? 'Kargo Şirketi' : 'Carrier'}</p>
                    <p className="font-bold text-gray-900">{trackingResult.carrier} {trackingResult.service}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{i18n.language === 'tr' ? 'Tahmini Teslimat' : 'Estimated Delivery'}</p>
                    <p className="font-bold text-gray-900">{trackingResult.estimatedDelivery}</p>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded-lg flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-blue-600 font-medium">{i18n.language === 'tr' ? 'Şu Anki Konum' : 'Current Location'}</p>
                    <p className="text-blue-800 font-bold">{trackingResult.currentLocation}</p>
                  </div>
                </div>

                {/* Route Information */}
                {(trackingResult.origin || trackingResult.destination) && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">
                      {i18n.language === 'tr' ? 'Kargo Rotası' : 'Shipping Route'}
                    </h4>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{trackingResult.origin}</span>
                      <div className="flex-1 mx-4 border-t border-dashed border-gray-300"></div>
                      <span className="text-gray-600">{trackingResult.destination}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Package Details */}
            {(trackingResult.packageWeight || trackingResult.packageDimensions) && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-6 h-6" />
                    {i18n.language === 'tr' ? 'Paket Detayları' : 'Package Details'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {trackingResult.packageWeight && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">
                          {i18n.language === 'tr' ? 'Ağırlık' : 'Weight'}
                        </p>
                        <p className="font-bold text-gray-900">{trackingResult.packageWeight}</p>
                      </div>
                    )}
                    {trackingResult.packageDimensions && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">
                          {i18n.language === 'tr' ? 'Boyutlar' : 'Dimensions'}
                        </p>
                        <p className="font-bold text-gray-900">{trackingResult.packageDimensions}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Carrier Information */}
            {trackingResult.carrierTrackingNumber && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="w-6 h-6" />
                    {i18n.language === 'tr' ? 'Kargo Şirketi Bilgileri' : 'Carrier Information'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">
                        {i18n.language === 'tr' ? 'Kargo Şirketi' : 'Carrier'}
                      </p>
                      <p className="font-bold text-gray-900">{trackingResult.carrier}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">
                        {i18n.language === 'tr' ? 'Kargo Takip Numarası' : 'Carrier Tracking Number'}
                      </p>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-900">{trackingResult.carrierTrackingNumber}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(trackingResult.carrierTrackingNumber)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            

            {/* Timeline */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-6 h-6" />
                  {i18n.language === 'tr' ? 'Kargo Geçmişi' : 'Tracking History'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {trackingResult.timeline.map((event: any, index: number) => (
                    <div key={index} className="flex items-start gap-4">
                      <div className="flex-shrink-0 mt-1">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg ${
                          event.completed ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                        }`}>
                          {event.icon || '📦'}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{event.status}</p>
                            <p className="text-xs text-gray-500 mt-1">{event.description}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-500">{event.date}</p>
                            <p className="text-xs text-gray-400">{event.time}</p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {event.location}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Help Section */}
        <div className="mt-12">
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-6">
              <div className="text-center">
                <Eye className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {i18n.language === 'tr' ? 'Takip Numaranız Yok mu?' : 'No Tracking Number?'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {i18n.language === 'tr' 
                    ? 'Hesabınıza giriş yaparak tüm gönderilerinizi görüntüleyebilir ve takip edebilirsiniz.' 
                    : 'Log in to your account to view and track all your shipments.'}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button 
                    onClick={() => window.location.href = '/auth'}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {i18n.language === 'tr' ? 'Giriş Yap' : 'Sign In'}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => window.location.href = '/contact'}
                    className="border-blue-300 text-blue-600 hover:bg-blue-50"
                  >
                    {i18n.language === 'tr' ? 'Destek Al' : 'Get Support'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {i18n.language === 'tr' ? 'Takip Özelliklerimiz' : 'Our Tracking Features'}
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              {i18n.language === 'tr' 
                ? 'Paketinizin her anını takip etmenizi sağlayan gelişmiş özellikler'
                : 'Advanced features that let you track every moment of your package journey'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {i18n.language === 'tr' ? 'Gerçek Zamanlı' : 'Real-time'}
              </h3>
              <p className="text-gray-600">
                {i18n.language === 'tr' 
                  ? 'Paketinizin konumu ve durumu anlık olarak güncellenir'
                  : 'Your package location and status are updated instantly'}
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {i18n.language === 'tr' ? 'Detaylı Konum' : 'Detailed Location'}
              </h3>
              <p className="text-gray-600">
                {i18n.language === 'tr' 
                  ? 'Paketinizin hangi şehir ve dağıtım merkezinde olduğunu görün'
                  : 'See which city and distribution center your package is in'}
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Truck className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {i18n.language === 'tr' ? 'Tam Geçmiş' : 'Complete History'}
              </h3>
              <p className="text-gray-600">
                {i18n.language === 'tr' 
                  ? 'Paketinizin tüm hareketlerini tarih ve saat detayıyla inceleyin'
                  : 'Review all package movements with detailed dates and times'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </SharedMarketingLayout>
  );
}