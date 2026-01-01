import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Package, TruckIcon, ArrowLeft } from "lucide-react";
const moogshipLogo = "/moogship-logo.jpg";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export default function ForgotPasswordPage() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [forceUpdate, setForceUpdate] = useState(0);

  // Force component to re-render when language changes
  useEffect(() => {
    const handleLanguageChange = () => {
      setForceUpdate(prev => prev + 1);
    };

    i18n.on('languageChanged', handleLanguageChange);
    return () => i18n.off('languageChanged', handleLanguageChange);
  }, [i18n, t]);

  const form = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof forgotPasswordSchema>) => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(t('auth.forgotPassword.success.description'));
        form.reset();
      } else {
        setError(data.message || t('auth.forgotPassword.error.description'));
      }
    } catch (error) {
      setError(t('auth.forgotPassword.error.description'));
      console.error("Forgot password error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div key={`forgot-password-${i18n.language}-${forceUpdate}`} className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <img 
                src={moogshipLogo} 
                alt="Moogship Logo" 
                className="h-10 w-auto cursor-pointer" 
                onClick={() => setLocation("/")}
              />
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => setLocation("/auth")}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('auth.forgotPassword.backToLogin')}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <Card className="border shadow-lg rounded-xl">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-gray-900">{t('auth.forgotPassword.title', 'Reset Password')}</CardTitle>
              <CardDescription>
                {t('auth.forgotPassword.description', 'Enter your email address and we\'ll send you a password reset link.')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {success && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm text-green-700">{success}</p>
                  <div className="mt-3 text-xs text-green-600">
                    <p>• {t('auth.forgotPassword.success.instruction1', 'Check your email inbox (including spam folder)')}</p>
                    <p>• {t('auth.forgotPassword.success.instruction2', 'Click the reset link in the email')}</p>
                    <p>• {t('auth.forgotPassword.success.instruction3', 'Follow the instructions to set your new password')}</p>
                  </div>
                </div>
              )}

              {!success && (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('auth.forgotPassword.emailLabel', 'Email Address')}</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder={t('auth.forgotPassword.emailPlaceholder', 'Enter your email address')}
                              {...field}
                              className="h-10 text-base"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full h-10 text-base font-medium bg-gradient-to-r from-blue-400 to-blue-500 hover:from-blue-400 hover:to-blue-400"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          {t('auth.forgotPassword.sending')}
                        </>
                      ) : (
                        t('auth.forgotPassword.sendButton', 'Send Reset Link')
                      )}
                    </Button>
                  </form>
                </Form>
              )}

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  {t('auth.forgotPassword.rememberPassword', 'Remember your password?')}{" "}
                  <button
                    onClick={() => setLocation("/auth")}
                    className="text-blue-600 hover:text-blue-800 underline font-medium"
                  >
                    {t('auth.forgotPassword.backToLogin', 'Back to Login')}
                  </button>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center mb-4">
                <img 
                  src={moogshipLogo} 
                  alt="Moogship Logo" 
                  className="h-10 w-auto bg-white p-1 rounded cursor-pointer" 
                  onClick={() => setLocation('/marketing')}
                />
              </div>
              <p className="text-gray-400 mb-4">
                {t('footer.description', 'Global shipping logistics platform for businesses of all sizes.')}
              </p>
              <div className="flex space-x-4">
                {['facebook', 'twitter', 'linkedin', 'instagram'].map((social) => (
                  <span 
                    key={social} 
                    onClick={() => window.open(`https://www.${social}.com/moogship`, '_blank')}
                    className="text-gray-400 hover:text-white cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center">
                      <span className="text-sm">{social[0].toUpperCase()}</span>
                    </div>
                  </span>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-4">{t('footer.company', 'Company')}</h3>
              <ul className="space-y-2">
                <li><span onClick={() => setLocation('/about')} className="text-gray-400 hover:text-white cursor-pointer">{t('footer.aboutUs', 'About Us')}</span></li>
                <li><span onClick={() => setLocation('/careers')} className="text-gray-400 hover:text-white cursor-pointer">{t('footer.careers', 'Careers')}</span></li>
                <li><span onClick={() => setLocation('/contact')} className="text-gray-400 hover:text-white cursor-pointer">{t('footer.contact', 'Contact')}</span></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-4">{t('footer.services', 'Services')}</h3>
              <ul className="space-y-2">
                <li><span onClick={() => setLocation('/services')} className="text-gray-400 hover:text-white cursor-pointer">{t('footer.globalShipping', 'Global Shipping')}</span></li>
                <li><span onClick={() => setLocation('/services')} className="text-gray-400 hover:text-white cursor-pointer">{t('footer.packageTracking', 'Package Tracking')}</span></li>
                <li><span onClick={() => setLocation('/services')} className="text-gray-400 hover:text-white cursor-pointer">{t('footer.marketplaceIntegration', 'Marketplace Integration')}</span></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-4">{t('footer.legal', 'Legal')}</h3>
              <ul className="space-y-2">
                <li><span onClick={() => setLocation('/legal/terms')} className="text-gray-400 hover:text-white cursor-pointer">{t('footer.termsOfService', 'Terms of Service')}</span></li>
                <li><span onClick={() => setLocation('/legal/privacy')} className="text-gray-400 hover:text-white cursor-pointer">{t('footer.privacyPolicy', 'Privacy Policy')}</span></li>
                <li><span onClick={() => setLocation('/legal/cookies')} className="text-gray-400 hover:text-white cursor-pointer">{t('footer.cookiePolicy', 'Cookie Policy')}</span></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">{t('footer.copyright', '© 2025 MoogShip. All rights reserved.')}</p>
            <div className="mt-4 md:mt-0 flex space-x-4">
              <span onClick={() => setLocation('/legal/terms')} className="text-gray-400 hover:text-white text-sm cursor-pointer">{t('footer.terms', 'Terms')}</span>
              <span onClick={() => setLocation('/legal/privacy')} className="text-gray-400 hover:text-white text-sm cursor-pointer">{t('footer.privacy', 'Privacy')}</span>
              <span onClick={() => setLocation('/legal/cookies')} className="text-gray-400 hover:text-white text-sm cursor-pointer">{t('footer.cookies', 'Cookies')}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}