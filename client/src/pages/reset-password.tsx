import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/language-switcher";

const resetPasswordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function ResetPasswordPage() {
  console.log("ResetPasswordPage component loaded");
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const { toast } = useToast();
  const { t, i18n } = useTranslation();

  const form = useForm<z.infer<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  // Force refresh when language changes
  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      // Language changed, trigger re-render if needed

      
      // Force re-render with language dependency
      setRefreshKey(prev => prev + 1);
    };

    i18n.on('languageChanged', handleLanguageChange);
    
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n, t]);

  useEffect(() => {
    // Get token from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const resetToken = urlParams.get('token');
    
    console.log("Reset password page - Current URL:", window.location.href);
    console.log("Reset password page - Token from URL:", resetToken);
    console.log("Reset password page - Full search params:", urlParams.toString());
    
    if (!resetToken) {
      console.log("Reset password page - No token found in URL");
      setError("Invalid reset link. Please request a new password reset.");
    } else {
      console.log("Reset password page - Token found, setting token:", resetToken);
      setToken(resetToken);
    }
  }, []);

  const onSubmit = async (values: z.infer<typeof resetPasswordSchema>) => {
    if (!token) {
      setError("Invalid reset token. Please request a new password reset.");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          newPassword: values.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess("Password reset successfully! Redirecting to login...");
        toast({
          title: "Success",
          description: "Your password has been reset successfully.",
        });
        
        // Redirect to login after 2 seconds
        setTimeout(() => {
          setLocation("/auth");
        }, 2000);
      } else {
        setError(data.message || "Failed to reset password. Please try again.");
      }
    } catch (error) {
      setError("An unexpected error occurred. Please try again later.");
      console.error("Reset password error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div key={refreshKey} className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-blue-600">Moogship</h1>
            </div>
            <div className="flex items-center space-x-4">
              <LanguageSwitcher />
              <a href="/auth" className="text-gray-600 hover:text-blue-600 transition-colors">
                {t('auth.resetPassword.backToLogin', 'Back to Login')}
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <Card className="border shadow-lg rounded-xl">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-gray-900">{t('auth.resetPassword.title', 'Set New Password')}</CardTitle>
              <CardDescription>
                {t('auth.resetPassword.description', 'Please enter your new password. Password must be at least 6 characters long.')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-700">{error}</p>
                  <div className="mt-2">
                    <button
                      onClick={() => setLocation("/auth")}
                      className="text-sm text-red-600 hover:text-red-800 underline"
                    >
                      Go back to login
                    </button>
                  </div>
                </div>
              )}

              {success && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm text-green-700">{success}</p>
                  <p className="text-xs text-green-600 mt-1">Redirecting you to login page...</p>
                </div>
              )}

              {token && !success && (
                <div key={`form-container-${refreshKey}-${i18n.language}`}>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('auth.resetPassword.passwordLabel', 'New Password')}</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder={t('auth.resetPassword.passwordPlaceholder', 'Enter your new password')}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('auth.resetPassword.confirmPasswordLabel', 'Confirm Password')}</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder={t('auth.resetPassword.confirmPasswordPlaceholder', 'Enter your password again')}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={isLoading}
                      >
                        {isLoading ? t('auth.resetPassword.resetting', 'Resetting...') : t('auth.resetPassword.resetButton', 'Reset Password')}
                      </Button>
                    </form>
                  </Form>
                </div>
              )}

              {!token && !success && (
                <div className="text-center">
                  <Button
                    onClick={() => setLocation("/auth")}
                    variant="outline"
                    className="w-full"
                  >
                    Back to Login
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              © 2025 Moogship. All rights reserved.
            </div>
            <div className="flex space-x-6">
              <a href="/legal/privacy" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
                Privacy Policy
              </a>
              <a href="/legal/terms" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
                Terms of Service
              </a>
              <a href="/contact" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
                Support
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}