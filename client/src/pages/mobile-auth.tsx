import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, ArrowLeft, Mail, Eye, EyeOff } from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";
import { MiniLanguageSwitcher } from "../components/language-switcher";
import { useTranslation } from "react-i18next";

import Alt_n_Sar_s__Kag__t_Uc_ak from "@assets/Altın Sarısı Kağıt Uçak.png";

import ChatGPT_Image_11_May_2025_10_51_43 from "@assets/ChatGPT Image 11 May 2025 10_51_43.png";

export default function MobileAuthPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState("login");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState<string | null>(null);
  
  // Sign-up form data
  const [signUpData, setSignUpData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    name: "",
    email: "",
    phone: "",
    companyName: "",
    companyType: "business" as const,
    taxIdNumber: "",
    address1: "",
    address2: "",
    city: "",
    postalCode: "",
    country: "",
    shipmentCapacity: ""
  });
  const [signUpLoading, setSignUpLoading] = useState(false);
  
  // Password visibility states
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Login successful",
          description: "Welcome back!",
          duration: 3000,
        });
        
        // Check if user is admin
        if (data.user && data.user.role === 'admin') {
          setLocation("/admin/dashboard");
        } else {
          setLocation("/dashboard");
        }
      } else {
        setError(data.message || "Login failed. Please check your credentials.");
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("Connection error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotPasswordLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: forgotPasswordEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        setForgotPasswordSuccess("Password reset link sent to your email address.");
        setForgotPasswordEmail("");
      } else {
        setError(data.message || "Failed to send reset email. Please try again.");
      }
    } catch (error) {
      console.error("Forgot password error:", error);
      setError("Connection error. Please try again.");
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignUpLoading(true);
    setError(null);

    if (signUpData.password !== signUpData.confirmPassword) {
      setError("Passwords do not match.");
      setSignUpLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(signUpData),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Account created successfully",
          description: "Please check your email to verify your account.",
          duration: 4000,
        });
        
        // Switch back to login tab
        setActiveTab("login");
        setSignUpData({
          username: "",
          password: "",
          confirmPassword: "",
          name: "",
          email: "",
          phone: "",
          companyName: "",
          companyType: "business",
          taxIdNumber: "",
          address1: "",
          address2: "",
          city: "",
          postalCode: "",
          country: "",
          shipmentCapacity: ""
        });
      } else {
        setError(data.message || "Registration failed. Please try again.");
      }
    } catch (error) {
      console.error("Sign up error:", error);
      setError("Connection error. Please try again.");
    } finally {
      setSignUpLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex flex-col">
      {/* Top Navigation */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center text-sm">
          <img 
            src={Alt_n_Sar_s__Kag__t_Uc_ak} 
            alt="moogship logo" 
            className="w-10 h-10 mr-2 rounded cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => window.location.href = '/'}
          />
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => window.open('https://wa.me/905407447911?text=Merhaba,%20Moogship%20hakkında%20bilgi%20almak%20istiyorum.', '_blank')}
            className="flex items-center justify-center w-10 h-10 bg-green-500 rounded-full shadow-lg hover:bg-green-600 hover:shadow-xl transform hover:scale-110 transition-all duration-200"
          >
            <SiWhatsapp className="h-5 w-5 text-white" />
          </button>
          <MiniLanguageSwitcher />
        </div>
      </div>
      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-4">
        {/* Large Logo and Title */}
        <div className="text-center">
          <div>
            <div className="w-64 h-64 flex items-center justify-center mx-auto">
              <img 
                src={ChatGPT_Image_11_May_2025_10_51_43} 
                alt="moogship logo" 
                className="w-64 h-48 rounded-lg object-cover object-center"
                style={{
                  objectPosition: 'center',
                  transform: 'scale(1.2)',
                }}
              />
            </div>
          </div>

          <p className="text-gray-600 text-sm px-4 leading-relaxed">
            {i18n.language === 'tr' ? 'Herkes için Global E-ticaret Kargo Çözümlerini Basitleştiriyoruz' : 'Simplifying Global E-commerce Shipping Solutions for Everyone'}
          </p>
        </div>

        {/* Back Button */}
        {!showForgotPassword && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => window.location.href = '/'}
            className="flex items-center text-blue-600 mb-6 hover:text-blue-800"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('auth.backToHome', 'Back to Home')}
          </Button>
        )}

        {/* Auth Card */}
        <Card className="w-full max-w-sm mx-auto shadow-lg border-0 rounded-2xl bg-white">
          <CardContent className="p-6">
            {error && (
              <Alert className="mb-4" variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Forgot Password Form */}
            {showForgotPassword ? (
              <div className="space-y-4">
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <label htmlFor="forgotEmail" className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <Input
                      id="forgotEmail"
                      type="email"
                      placeholder="Enter your email"
                      value={forgotPasswordEmail}
                      onChange={(e) => setForgotPasswordEmail(e.target.value)}
                      required
                      className="h-12"
                    />
                  </div>

                  {forgotPasswordSuccess && (
                    <Alert className="bg-green-50 border-green-200">
                      <Mail className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800">
                        {forgotPasswordSuccess}
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                    disabled={forgotPasswordLoading}
                  >
                    {forgotPasswordLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      "Send Reset Link"
                    )}
                  </Button>
                </form>
              </div>
            ) : (
              /* Tab Interface */
              (<Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2 mb-6 bg-gray-100 rounded-xl p-1">
                  <TabsTrigger 
                    value="login" 
                    className="rounded-lg py-3 text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm"
                  >
                    {i18n.language === 'tr' ? 'Giriş' : 'Login'}
                  </TabsTrigger>
                  <TabsTrigger 
                    value="register" 
                    className="rounded-lg py-3 text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm"
                  >
                    {i18n.language === 'tr' ? 'Kayıt' : 'Register'}
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="login" className="space-y-4 mt-0">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                        {i18n.language === 'tr' ? 'Kullanıcı Adı' : 'Username'}
                      </label>
                      <Input
                        id="username"
                        type="text"
                        placeholder={i18n.language === 'tr' ? 'Kullanıcı adınızı girin' : 'Enter your username'}
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        className="h-12 rounded-xl border-gray-200 bg-gray-50 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                        {i18n.language === 'tr' ? 'Şifre' : 'Password'}
                      </label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showLoginPassword ? "text" : "password"}
                          placeholder={i18n.language === 'tr' ? 'Şifrenizi girin' : 'Enter your password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="h-12 rounded-xl border-gray-200 bg-gray-50 focus:bg-white pr-12"
                        />
                        <button
                          type="button"
                          onClick={() => setShowLoginPassword(!showLoginPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        >
                          {showLoginPassword ? (
                            <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                          ) : (
                            <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                          )}
                        </button>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl mt-6" 
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t('auth.login.loggingIn', 'Logging In...')}
                        </>
                      ) : (
                        t('auth.login.loginButton', 'Login')
                      )}
                    </Button>

                    <div className="text-center pt-4">
                      <Button 
                        type="button"
                        variant="link" 
                        className="text-blue-600 text-sm font-medium underline hover:text-blue-800 p-0"
                        onClick={() => setShowForgotPassword(true)}
                      >
                        {t('auth.login.forgotPassword', 'Forgot your password?')}
                      </Button>
                    </div>
                    
                    <div className="text-center pt-4 border-t mt-6">
                      <p className="text-sm text-gray-600 mt-3">
                        {t('auth.login.noAccount', 'Don\'t have an account?')}{' '}
                        <Button 
                          type="button"
                          variant="link" 
                          className="text-blue-600 font-medium underline hover:text-blue-800 p-0"
                          onClick={() => setActiveTab('register')}
                        >
                          {i18n.language === 'tr' ? 'Kayıt Ol' : 'Sign Up'}
                        </Button>
                      </p>
                    </div>
                  </form>
                </TabsContent>
                <TabsContent value="register" className="space-y-3 mt-0">
                  <div className="max-h-80 overflow-y-auto px-1">
                    <form onSubmit={handleSignUp} className="space-y-3">
                      
                      {/* Personal Information */}
                      <div>
                        <label className="block text-sm font-medium mb-1">{t('auth.register.fullName', 'Full Name')}</label>
                        <Input
                          type="text"
                          placeholder={t('auth.register.fullNamePlaceholder', 'John Doe')}
                          value={signUpData.name}
                          onChange={(e) => setSignUpData({...signUpData, name: e.target.value})}
                          required
                          className="h-10"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">{t('auth.register.email', 'Email')}</label>
                        <Input
                          type="email"
                          placeholder={t('auth.register.emailPlaceholder', 'john@example.com')}
                          value={signUpData.email}
                          onChange={(e) => setSignUpData({...signUpData, email: e.target.value})}
                          required
                          className="h-10"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">{t('auth.register.username', 'Username')}</label>
                        <Input
                          type="text"
                          placeholder={t('auth.register.usernamePlaceholder', 'Choose a username')}
                          value={signUpData.username}
                          onChange={(e) => setSignUpData({...signUpData, username: e.target.value})}
                          required
                          className="h-10"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">{t('auth.register.password', 'Password')}</label>
                        <div className="relative">
                          <Input
                            type={showRegisterPassword ? "text" : "password"}
                            placeholder={t('auth.register.passwordPlaceholder', 'Min 8 characters')}
                            value={signUpData.password}
                            onChange={(e) => setSignUpData({...signUpData, password: e.target.value})}
                            required
                            className="h-10 pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          >
                            {showRegisterPassword ? (
                              <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                            ) : (
                              <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">{t('auth.register.confirmPassword', 'Confirm Password')}</label>
                        <div className="relative">
                          <Input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder={t('auth.register.confirmPasswordPlaceholder', 'Confirm your password')}
                            value={signUpData.confirmPassword}
                            onChange={(e) => setSignUpData({...signUpData, confirmPassword: e.target.value})}
                            required
                            className="h-10 pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                            ) : (
                              <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">{t('auth.register.phone', 'Phone Number')}</label>
                        <Input
                          type="tel"
                          placeholder={t('auth.register.phonePlaceholder', '+1 (555) 123-4567')}
                          value={signUpData.phone}
                          onChange={(e) => setSignUpData({...signUpData, phone: e.target.value})}
                          required
                          className="h-10"
                        />
                      </div>

                      {/* Business Information */}
                      <div className="border-t pt-3 mt-4">
                        <h3 className="text-sm font-semibold text-gray-800 mb-3">{t('auth.register.businessInfo', 'Business Information')}</h3>
                        
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">{t('auth.register.companyName', 'Company Name')}</label>
                            <Input
                              type="text"
                              placeholder={t('auth.register.companyNamePlaceholder', 'Your Company Ltd.')}
                              value={signUpData.companyName}
                              onChange={(e) => setSignUpData({...signUpData, companyName: e.target.value})}
                              required
                              className="h-9 text-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">{t('auth.register.taxId', 'Tax ID Number')}</label>
                            <Input
                              type="text"
                              placeholder={t('auth.register.taxIdPlaceholder', 'Tax/VAT Number')}
                              value={signUpData.taxIdNumber}
                              onChange={(e) => setSignUpData({...signUpData, taxIdNumber: e.target.value})}
                              required
                              className="h-9 text-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">{i18n.language === 'tr' ? 'İş Adresi' : 'Business Address'}</label>
                            <Input
                              type="text"
                              placeholder={t('auth.register.businessAddressPlaceholder', '123 Business St')}
                              value={signUpData.address1}
                              onChange={(e) => setSignUpData({...signUpData, address1: e.target.value})}
                              required
                              className="h-9 text-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">{t('auth.register.city', 'City')}</label>
                            <Input
                              type="text"
                              placeholder={t('auth.register.cityPlaceholder', 'City')}
                              value={signUpData.city}
                              onChange={(e) => setSignUpData({...signUpData, city: e.target.value})}
                              required
                              className="h-9 text-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">{t('auth.register.country', 'Country')}</label>
                            <Input
                              type="text"
                              placeholder={t('auth.register.countryPlaceholder', 'Country')}
                              value={signUpData.country}
                              onChange={(e) => setSignUpData({...signUpData, country: e.target.value})}
                              required
                              className="h-9 text-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">{i18n.language === 'tr' ? 'Aylık Kargo Kapasitesi' : 'Monthly Shipment Capacity'}</label>
                            <Input
                              type="number"
                              placeholder={i18n.language === 'tr' ? 'Beklenen aylık kargo sayısı' : 'Expected monthly shipments'}
                              value={signUpData.shipmentCapacity}
                              onChange={(e) => setSignUpData({...signUpData, shipmentCapacity: e.target.value})}
                              required
                              className="h-9 text-sm"
                            />
                          </div>
                        </div>
                      </div>

                      <Button
                        type="submit"
                        className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium mt-6"
                        disabled={signUpLoading}
                      >
                        {signUpLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {i18n.language === 'tr' ? 'Hesap Oluşturuluyor...' : 'Creating Account...'}
                          </>
                        ) : (
                          i18n.language === 'tr' ? 'Hesap Oluştur' : 'Create Account'
                        )}
                      </Button>
                    </form>
                  </div>
                </TabsContent>
              </Tabs>)
            )}
          </CardContent>
        </Card>
      </div>
      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-3">
              {i18n.language === 'tr' ? '© 2025 MoogShip. Tüm hakları saklıdır.' : '© 2025 MoogShip. All rights reserved.'}
            </p>
            <div className="flex justify-center space-x-6 text-xs">
              <a href="/legal/terms" className="text-blue-600 hover:text-blue-800 underline">
                {i18n.language === 'tr' ? 'Hizmet Şartları' : 'Terms of Service'}
              </a>
              <a href="/legal/privacy" className="text-blue-600 hover:text-blue-800 underline">
                {i18n.language === 'tr' ? 'Gizlilik Politikası' : 'Privacy Policy'}
              </a>
              <a href="/company/contact" className="text-blue-600 hover:text-blue-800 underline">
                {i18n.language === 'tr' ? 'Destek İletişim' : 'Contact Support'}
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}