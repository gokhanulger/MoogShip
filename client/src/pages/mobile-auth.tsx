import { useState } from "react";
import { useLocation } from "wouter";
import { Loader2, Eye, EyeOff, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import moogshipLogo from "@/assets/moogship-logo.jpg";
import { getApiUrl } from "@/lib/queryClient";

// Username input component - MUST be outside main component to prevent re-creation
const UsernameInput = ({
  label,
  value,
  onChange,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-600 mb-1.5">{label}</label>
    <input
      type="text"
      inputMode="email"
      autoCapitalize="none"
      autoCorrect="off"
      autoComplete="off"
      spellCheck={false}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required
      className="w-full h-14 px-4 text-base bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
      style={{ textTransform: 'lowercase' }}
    />
  </div>
);

// Regular input component
const AppInput = ({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required = true
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-600 mb-1.5">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className="w-full h-14 px-4 text-base bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
    />
  </div>
);

// Password input component
const PasswordInput = ({
  label,
  value,
  onChange,
  show,
  onToggle,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  show: boolean;
  onToggle: () => void;
  placeholder?: string;
}) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-600 mb-1.5">{label}</label>
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required
        className="w-full h-14 px-4 pr-12 text-base bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
      >
        {show ? <EyeOff size={22} /> : <Eye size={22} />}
      </button>
    </div>
  </div>
);

export default function MobileAuthPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { i18n } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Login form
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Register form
  const [regData, setRegData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    name: "",
    email: "",
    phone: "",
    companyName: "",
    taxIdNumber: "",
    address1: "",
    city: "",
    country: "",
    shipmentCapacity: ""
  });
  const [showRegPassword, setShowRegPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Convert username to lowercase before sending
    const loginUsername = username.toLowerCase();

    try {
      const apiUrl = getApiUrl("/api/login");
      console.log("Login API URL:", apiUrl);

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ username: loginUsername, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store user data for Capacitor/mobile apps
        if (data.user) {
          try {
            localStorage.setItem('moogship_auth_user', JSON.stringify(data.user));
            localStorage.setItem('moogship_session_user', JSON.stringify(data.user));
            sessionStorage.setItem('moogship_session_user', JSON.stringify(data.user));
          } catch (e) {
            console.warn('Could not store user data:', e);
          }
        }

        toast({
          title: i18n.language === 'tr' ? "Giris basarili" : "Login successful",
          description: i18n.language === 'tr' ? "Hosgeldiniz!" : "Welcome back!",
          duration: 2000,
        });

        if (data.user?.role === 'admin') {
          setLocation("/admin/dashboard");
        } else {
          setLocation("/dashboard");
        }
      } else {
        setError(data.message || (i18n.language === 'tr' ? "Giris basarisiz" : "Login failed"));
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message || (i18n.language === 'tr' ? "Baglanti hatasi" : "Connection error"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (regData.password !== regData.confirmPassword) {
      setError(i18n.language === 'tr' ? "Sifreler eslesmiyor" : "Passwords don't match");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(getApiUrl("/api/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...regData,
          username: regData.username.toLowerCase(),
          companyType: "business",
          monthlyShipmentCapacity: parseInt(regData.shipmentCapacity) || 0
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: i18n.language === 'tr' ? "Kayit basarili" : "Registration successful",
          description: i18n.language === 'tr' ? "E-postanizi dogrulayin" : "Please verify your email",
          duration: 3000,
        });
        setIsLogin(true);
        setRegData({
          username: "", password: "", confirmPassword: "", name: "", email: "",
          phone: "", companyName: "", taxIdNumber: "", address1: "", city: "",
          country: "", shipmentCapacity: ""
        });
      } else {
        setError(data.message || (i18n.language === 'tr' ? "Kayit basarisiz" : "Registration failed"));
      }
    } catch (err) {
      setError(i18n.language === 'tr' ? "Baglanti hatasi" : "Connection error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="pt-6 pb-3 px-6 text-center">
        <div className="w-24 h-24 mx-auto rounded-2xl shadow-md bg-white p-3">
          <img
            src={moogshipLogo}
            alt="MoogShip"
            className="w-full h-full object-contain"
          />
        </div>
        <h1 className="text-lg font-bold text-gray-900 mt-2">MoogShip</h1>
        <p className="text-gray-500 text-xs">
          {i18n.language === 'tr' ? 'Global E-ticaret Kargo' : 'Global E-commerce Shipping'}
        </p>
      </div>

      {/* Tab Switcher */}
      <div className="px-6 mb-6">
        <div className="flex bg-gray-100 rounded-2xl p-1">
          <button
            onClick={() => { setIsLogin(true); setError(null); }}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${
              isLogin ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'
            }`}
          >
            {i18n.language === 'tr' ? 'Giris Yap' : 'Login'}
          </button>
          <button
            onClick={() => { setIsLogin(false); setError(null); }}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${
              !isLogin ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'
            }`}
          >
            {i18n.language === 'tr' ? 'Kayit Ol' : 'Register'}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-6 mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl">
          <p className="text-red-600 text-sm text-center">{error}</p>
        </div>
      )}

      {/* Forms */}
      <div className="flex-1 px-6 pb-8 overflow-y-auto">
        {isLogin ? (
          /* Login Form */
          <form onSubmit={handleLogin}>
            <UsernameInput
              label={i18n.language === 'tr' ? 'Kullanici Adi' : 'Username'}
              value={username}
              onChange={setUsername}
              placeholder={i18n.language === 'tr' ? 'kullaniciadi' : 'username'}
            />

            <PasswordInput
              label={i18n.language === 'tr' ? 'Sifre' : 'Password'}
              value={password}
              onChange={setPassword}
              show={showPassword}
              onToggle={() => setShowPassword(!showPassword)}
              placeholder="********"
            />

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl mt-4 flex items-center justify-center transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="animate-spin" size={22} />
              ) : (
                <>
                  {i18n.language === 'tr' ? 'Giris Yap' : 'Login'}
                  <ChevronRight size={20} className="ml-1" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setLocation("/forgot-password")}
              className="w-full text-blue-600 text-sm font-medium mt-4 py-2"
            >
              {i18n.language === 'tr' ? 'Sifremi Unuttum' : 'Forgot Password?'}
            </button>
          </form>
        ) : (
          /* Register Form */
          <form onSubmit={handleRegister} className="space-y-0">
            <AppInput
              label={i18n.language === 'tr' ? 'Ad Soyad' : 'Full Name'}
              value={regData.name}
              onChange={(v) => setRegData({...regData, name: v})}
              placeholder="John Doe"
            />

            <AppInput
              label={i18n.language === 'tr' ? 'E-posta' : 'Email'}
              value={regData.email}
              onChange={(v) => setRegData({...regData, email: v})}
              type="email"
              placeholder="john@example.com"
            />

            <AppInput
              label={i18n.language === 'tr' ? 'Telefon' : 'Phone'}
              value={regData.phone}
              onChange={(v) => setRegData({...regData, phone: v})}
              type="tel"
              placeholder="+90 555 123 4567"
            />

            <UsernameInput
              label={i18n.language === 'tr' ? 'Kullanici Adi' : 'Username'}
              value={regData.username}
              onChange={(v) => setRegData({...regData, username: v})}
              placeholder={i18n.language === 'tr' ? 'kullaniciadi' : 'username'}
            />

            <PasswordInput
              label={i18n.language === 'tr' ? 'Sifre' : 'Password'}
              value={regData.password}
              onChange={(v) => setRegData({...regData, password: v})}
              show={showRegPassword}
              onToggle={() => setShowRegPassword(!showRegPassword)}
              placeholder="********"
            />

            <PasswordInput
              label={i18n.language === 'tr' ? 'Sifre Tekrar' : 'Confirm Password'}
              value={regData.confirmPassword}
              onChange={(v) => setRegData({...regData, confirmPassword: v})}
              show={showRegPassword}
              onToggle={() => setShowRegPassword(!showRegPassword)}
              placeholder="********"
            />

            <div className="border-t border-gray-100 my-6 pt-4">
              <p className="text-xs text-gray-500 mb-4 font-medium uppercase tracking-wide">
                {i18n.language === 'tr' ? 'Sirket Bilgileri' : 'Company Info'}
              </p>

              <AppInput
                label={i18n.language === 'tr' ? 'Sirket Adi' : 'Company Name'}
                value={regData.companyName}
                onChange={(v) => setRegData({...regData, companyName: v})}
                placeholder="Acme Ltd."
              />

              <AppInput
                label={i18n.language === 'tr' ? 'Vergi No' : 'Tax ID'}
                value={regData.taxIdNumber}
                onChange={(v) => setRegData({...regData, taxIdNumber: v})}
                placeholder="1234567890"
              />

              <AppInput
                label={i18n.language === 'tr' ? 'Adres' : 'Address'}
                value={regData.address1}
                onChange={(v) => setRegData({...regData, address1: v})}
                placeholder={i18n.language === 'tr' ? 'Cadde/Sokak' : 'Street address'}
              />

              <div className="grid grid-cols-2 gap-3">
                <AppInput
                  label={i18n.language === 'tr' ? 'Sehir' : 'City'}
                  value={regData.city}
                  onChange={(v) => setRegData({...regData, city: v})}
                  placeholder="Istanbul"
                />
                <AppInput
                  label={i18n.language === 'tr' ? 'Ulke' : 'Country'}
                  value={regData.country}
                  onChange={(v) => setRegData({...regData, country: v})}
                  placeholder="Turkey"
                />
              </div>

              <AppInput
                label={i18n.language === 'tr' ? 'Aylik Kargo Sayisi' : 'Monthly Shipments'}
                value={regData.shipmentCapacity}
                onChange={(v) => setRegData({...regData, shipmentCapacity: v})}
                type="number"
                placeholder="100"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl flex items-center justify-center transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="animate-spin" size={22} />
              ) : (
                <>
                  {i18n.language === 'tr' ? 'Kayit Ol' : 'Register'}
                  <ChevronRight size={20} className="ml-1" />
                </>
              )}
            </button>
          </form>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-100 text-center">
        <p className="text-xs text-gray-400">
          © 2025 MoogShip. {i18n.language === 'tr' ? 'Tum haklar saklidir.' : 'All rights reserved.'}
        </p>
      </div>
    </div>
  );
}
