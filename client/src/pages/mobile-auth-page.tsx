import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, Package, ArrowLeft, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MiniLanguageSwitcher } from "../components/language-switcher";
import moogshipLogoPath from "../assets/moogship-logo.jpg";

export default function MobileAuthPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState<string | null>(null);

  // Handle login form submission
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      setError("Please enter both username and password");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Mobile-Request': 'true',
        },
        body: JSON.stringify({ username, password }),
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        localStorage.setItem('moogship_auth_user', JSON.stringify(data));
        toast({
          title: "Login successful",
          description: "Welcome back!",
          duration: 2000,
        });
        
        // Navigate based on user role
        const redirectPath = data.role === 'admin' ? '/admin-shipments' : '/dashboard';
        setLocation(redirectPath);
      } else {
        setError(data.message || "Login failed. Please check your credentials.");
      }
    } catch (error) {
      console.error("Mobile login error:", error);
      setError("Connection error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle forgot password form submission
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!forgotPasswordEmail) {
      setError("Please enter your email address");
      return;
    }

    setForgotPasswordLoading(true);
    setError(null);
    setForgotPasswordSuccess(null);

    try {
      const response = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: forgotPasswordEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        setForgotPasswordSuccess("Password reset instructions have been sent to your email address.");
        setForgotPasswordEmail("");
        // Switch back to login after 3 seconds
        setTimeout(() => {
          setShowForgotPassword(false);
          setForgotPasswordSuccess(null);
        }, 3000);
      } else {
        setError(data.message || "Failed to send password reset email. Please try again.");
      }
    } catch (error) {
      console.error("Forgot password error:", error);
      setError("Connection error. Please try again.");
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 cursor-pointer" onClick={() => window.location.href = '/'}>
                <img className="h-10 w-auto" src={moogshipLogoPath} alt="Moogship Logo" />
              </div>
              <div className="ml-3 text-lg font-medium text-blue-600">
                MoogShip
              </div>
            </div>
            
            <div className="flex items-center">
              <MiniLanguageSwitcher />
              <Button 
                variant="ghost" 
                size="sm" 
                className="ml-2 text-blue-600 hover:bg-blue-50"
                onClick={() => window.location.href = '/'}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Home
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-grow flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <img src={moogshipLogoPath} alt="Moogship Logo" className="h-16 w-16 rounded-lg bg-white p-2 shadow-md" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Moogship</h1>
            <p className="text-gray-600 text-sm">Global Shipping App from Turkey</p>
          </div>

          {/* Auth Card */}
          <Card className="shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl text-center">
                {showForgotPassword ? "Reset Password" : "Login to Your Account"}
              </CardTitle>
              {showForgotPassword && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setShowForgotPassword(false);
                    setError(null);
                    setForgotPasswordSuccess(null);
                  }}
                  className="absolute top-4 left-4 text-gray-500 hover:text-gray-700"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {!showForgotPassword ? (
                // Login Form
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <Input
                      type="text"
                      placeholder="Username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full"
                      disabled={isLoading}
                    />
                  </div>
                  
                  <div>
                    <Input
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full"
                      disabled={isLoading}
                    />
                  </div>

                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full bg-blue-600 hover:bg-blue-700" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Logging in...
                      </>
                    ) : (
                      "Login"
                    )}
                  </Button>

                  <div className="text-center mt-4">
                    <Button 
                      type="button"
                      variant="link" 
                      className="text-blue-600 text-sm p-0 underline hover:text-blue-800"
                      onClick={() => setShowForgotPassword(true)}
                    >
                      Forgot your password?
                    </Button>
                  </div>
                </form>
              ) : (
                // Forgot Password Form
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="text-center mb-4">
                    <Mail className="h-12 w-12 text-blue-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">
                      Enter your email address and we'll send you a link to reset your password.
                    </p>
                  </div>
                  
                  <div>
                    <Input
                      type="email"
                      placeholder="Email address"
                      value={forgotPasswordEmail}
                      onChange={(e) => setForgotPasswordEmail(e.target.value)}
                      className="w-full"
                      disabled={forgotPasswordLoading}
                    />
                  </div>

                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {forgotPasswordSuccess && (
                    <Alert className="border-green-200 bg-green-50">
                      <Mail className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800">
                        {forgotPasswordSuccess}
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full bg-blue-600 hover:bg-blue-700" 
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
              )}

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Need help? Contact our support team
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm text-gray-600">
              © 2025 Moogship. All rights reserved.
            </p>
            <div className="mt-2 flex justify-center space-x-4 text-xs">
              <a href="/legal/terms" className="text-blue-600 hover:text-blue-800">Terms</a>
              <a href="/legal/privacy" className="text-blue-600 hover:text-blue-800">Privacy</a>
              <a href="/company/contact" className="text-blue-600 hover:text-blue-800">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}