import { useState } from "react";
import { Redirect, useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2, Package, TruckIcon, AlertCircle, CheckCircle, Mail } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { ResendVerification } from "@/components/resend-verification";
import { queryClient } from "@/lib/queryClient";

// Login form schema
const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Forgot password form schema
const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

// Registration form schema
const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  companyName: z.string().min(2, "Company name must be at least 2 characters"),
  companyType: z.enum(["business", "individual"], {
    errorMap: () => ({ message: "Please select company type" }),
  }), // This will be translated to "company" on the backend if "business" is selected
  taxIdNumber: z.string().min(1, "Tax ID is required"),
  address: z.string().min(5, "Address must be at least 5 characters"), // Kept for backward compatibility
  address1: z.string().max(35, "Address line 1 must be maximum 35 characters")
    .min(5, "Address line 1 must be at least 5 characters"),
  address2: z.string().max(35, "Address line 2 must be maximum 35 characters").optional(),
  city: z.string().min(2, "City is required"),
  postalCode: z.string().min(2, "Postal code is required"),
  country: z.string().min(2, "Country is required"),
  phone: z.string().min(5, "Phone number is required"),
  shipmentCapacity: z.string().min(1, "Monthly shipment capacity is required"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export default function AuthPage() {
  // Redirect mobile browsers to external mobile auth URL
  const isMobile = /Mobile|Android|iPhone|iPad/.test(navigator.userAgent);
  
  if (isMobile) {
    window.location.href = 'https://www.moogship.com/mobile-auth';
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Redirecting to mobile authentication...</p>
        </div>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState("login");
  const [location, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [registerSuccess, setRegisterSuccess] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [verificationNeeded, setVerificationNeeded] = useState<{email: string} | null>(null);
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState<string | null>(null);
  const [forgotPasswordError, setForgotPasswordError] = useState<string | null>(null);
  const { toast } = useToast();
  
  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });
  
  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      name: "",
      email: "",
      companyName: "",
      companyType: "business" as const,
      taxIdNumber: "",
      address: "",
      address1: "",
      address2: "",
      city: "",
      postalCode: "",
      country: "",
      phone: "",
      shipmentCapacity: "",
    },
  });
  
  const forgotPasswordForm = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });
  
  const onLoginSubmit = async (values: z.infer<typeof loginSchema>) => {
    // Enhanced mobile browser detection
    const isMobile = /Mobile|Android|iPhone|iPad/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    
    // Prevent multiple submissions
    if (isLoading) {
      console.log("[AUTH FORM] Login already in progress, ignoring submission");
      return;
    }
    
    try {
      setIsLoading(true);
      setLoginError(null);
      setVerificationNeeded(null);
      
      // CRITICAL: Clear all previous authentication data before attempting new login
      console.log("[AUTH FORM] Clearing all previous authentication data...");
      
      // Clear localStorage and sessionStorage
      const keysToRemove = [
        'moogship_auth_user',
        'moogship_session_timestamp',
        'moogship_mobile_session',
        'moogship_temp_user',
        'moogship_session_user',
        'mobile_safari_login_success',
        'mobile_safari_authenticated',
        'mobile_login_success',
        'mobile_login_failed',
        'mobile_login_error',
        'user',
        'auth_user',
        'session',
        'sessionId'
      ];
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
      
      // Clear all auth-related keys with pattern matching
      const allLocalKeys = Object.keys(localStorage);
      allLocalKeys.forEach(key => {
        const lowerKey = key.toLowerCase();
        if (lowerKey.includes('auth') || lowerKey.includes('user') || 
            lowerKey.includes('session') || lowerKey.includes('login') ||
            lowerKey.includes('moogship')) {
          localStorage.removeItem(key);
        }
      });
      
      // Clear session storage completely
      sessionStorage.clear();
      
      // Clear ALL React Query cache to prevent previous user data
      console.log("[AUTH FORM] Clearing all query cache to prevent previous user data...");
      queryClient.clear();
      
      // Force logout any existing server session
      try {
        console.log("[AUTH FORM] Forcing logout of any existing server session...");
        await fetch("/api/force-logout", {
          method: "POST",
          credentials: "include",
          cache: "no-store"
        });
      } catch (logoutError) {
        console.warn("[AUTH FORM] Force logout failed (continuing):", logoutError);
      }
      
      // Enhanced fetch configuration for mobile browsers
      const fetchConfig = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(values),
        credentials: 'include' as RequestCredentials,
      };

      // Add mobile-specific headers
      if (isMobile) {
        (fetchConfig.headers as any)['X-Mobile-Request'] = 'true';
        (fetchConfig.headers as any)['Cache-Control'] = 'no-cache';
        (fetchConfig.headers as any)['X-Requested-With'] = 'XMLHttpRequest';
      }
      
      console.log("[AUTH FORM] Attempting login for mobile:", isMobile);
      
      // Use single unified login endpoint for all browsers
      const response = await fetch('/api/login', fetchConfig);
      console.log("[AUTH FORM] Response status:", response.status);
      
      let data;
      try {
        data = await response.json();
        console.log("[AUTH FORM] Response data:", { success: data.success, hasUser: !!data.id });
      } catch (parseError) {
        console.error("[AUTH FORM] Failed to parse response:", parseError);
        setLoginError("Server response error. Please try again.");
        return;
      }
      
      if (!response.ok || !data.success) {
        console.log("[AUTH FORM] Login failed:", data.message);
        
        // Handle specific error cases with better mobile feedback
        if (response.status === 403) {
          if (data.message?.includes("Email verification required")) {
            setVerificationNeeded({ email: data.email });
            return;
          } else if (data.message?.includes("pending approval")) {
            setLoginError("Your account is waiting for admin approval.");
            return;
          }
        } else if (response.status === 401) {
          setLoginError("Incorrect username or password. Please try again.");
          return;
        } else if (response.status === 400) {
          setLoginError("Please enter both username and password.");
          return;
        } else if (response.status === 503) {
          setLoginError("Service temporarily unavailable. Please try again in a moment.");
          return;
        }
        
        setLoginError(data.message || "Login failed. Please try again.");
        return;
      }
      
      // Login successful
      console.log("[AUTH FORM] Login successful for user:", data.username);
      
      // Store user data in localStorage for mobile compatibility
      localStorage.setItem('moogship_auth_user', JSON.stringify(data));
      
      // Clear any previous mobile session issues
      localStorage.removeItem('mobile_login_failed');
      localStorage.setItem('mobile_login_success', 'true');
      
      toast({
        title: "Login successful",
        description: "Welcome back!",
        duration: 2000,
      });
      
      // Clear the form immediately to prevent resubmission
      loginForm.reset({ username: '', password: '' });
      
      // Enhanced navigation for all browsers
      const redirectPath = data.role === 'admin' ? '/admin-shipments' : '/dashboard';
      
      if (isMobile) {
        console.log("[AUTH FORM] Mobile login successful - direct navigation");
        // Immediate navigation for mobile
        setLocation(redirectPath);
      } else {
        // Short delay for desktop to ensure session is fully established
        setTimeout(() => {
          setLocation(redirectPath);
        }, 300);
      }
      
    } catch (error) {
      console.error("Login error:", error);
      
      // Simple error handling for mobile without retry to prevent duplicate logins
      
      // Check if it's a network error
      if (error instanceof TypeError && error.message.includes('fetch')) {
        setLoginError("Network connection failed. Please check your internet connection and try again.");
      } else if (error instanceof Error && (error.message.includes('Load failed') || error.message.includes('Request timeout'))) {
        setLoginError("Connection timeout. Please try again.");
      } else if (error instanceof Error && error.message.includes('NetworkError')) {
        setLoginError("Network error occurred. Please check your connection and try again.");
      } else {
        setLoginError("Connection error. Please try again.");
      }
      
      // Store error state for mobile debugging
      if (isMobile) {
        localStorage.setItem('mobile_login_error', JSON.stringify({
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }));
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const onRegisterSubmit = async (values: z.infer<typeof registerSchema>) => {
    try {
      setIsLoading(true);
      setRegisterSuccess(null);
      setRegisterError(null);
      
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });
      
      const data = await response.json();
      
      if (response.status === 201) {
        setRegisterSuccess(data.message || "Registration successful! Please check your email for verification instructions.");
        
        // Reset form after successful registration
        registerForm.reset();
        
        // Switch to login tab after a delay
        setTimeout(() => {
          setActiveTab("login");
          setRegisterSuccess(null);
        }, 5000);
      } else {
        setRegisterError(data.message || "Registration failed. Please try again.");
      }
    } catch (error) {
      setRegisterError("An unexpected error occurred. Please try again later.");
      console.error("Registration error:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const onForgotPasswordSubmit = async (values: z.infer<typeof forgotPasswordSchema>) => {
    try {
      setIsLoading(true);
      setForgotPasswordSuccess(null);
      setForgotPasswordError(null);
      
      const response = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setForgotPasswordSuccess("Password reset instructions have been sent to your email address. Please check your inbox and follow the instructions to reset your password.");
        
        // Reset form after successful submission
        forgotPasswordForm.reset();
        
        // Switch back to login tab after a delay
        setTimeout(() => {
          setActiveTab("login");
          setForgotPasswordSuccess(null);
        }, 8000);
      } else {
        setForgotPasswordError(data.message || "Failed to send password reset email. Please try again.");
      }
    } catch (error) {
      setForgotPasswordError("An unexpected error occurred. Please try again later.");
      console.error("Forgot password error:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-gray-50">
      {/* Left column - Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Package className="h-12 w-12 text-primary-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Moogship</h1>
            <p className="text-gray-600">Global Shipping App from Turkey</p>
          </div>
          
          <Tabs 
            defaultValue="login" 
            value={activeTab} 
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
              <TabsTrigger value="forgot-password">Reset Password</TabsTrigger>
            </TabsList>
            
            {/* Login Form */}
            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>Login to your account</CardTitle>
                  <CardDescription>
                    Enter your credentials to access your account
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                      <FormField
                        control={loginForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter your username" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Enter your password" {...field} />
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
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Logging in...
                          </>
                        ) : (
                          "Login"
                        )}
                      </Button>
                      
                      {/* Email verification alert */}
                      {verificationNeeded && (
                        <div className="mt-4">
                          <Alert variant="destructive" className="mb-2">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Email Verification Required</AlertTitle>
                            <AlertDescription>
                              Please verify your email address before logging in.
                            </AlertDescription>
                          </Alert>
                          
                          <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-2">
                            <div className="flex items-center">
                              <Mail className="h-5 w-5 text-amber-500 mr-2" />
                              <p className="text-sm text-amber-800">
                                A verification email was sent to <strong>{verificationNeeded.email}</strong>
                              </p>
                            </div>
                          </div>
                          
                          <ResendVerification email={verificationNeeded.email} />
                        </div>
                      )}
                      
                      {/* Login error message */}
                      {loginError && !verificationNeeded && (
                        <Alert variant="destructive" className="mt-4">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Login Failed</AlertTitle>
                          <AlertDescription>{loginError}</AlertDescription>
                        </Alert>
                      )}
                    </form>
                  </Form>
                </CardContent>
                <CardFooter className="flex flex-col space-y-2">
                  <div className="text-sm text-gray-500 text-center">
                    <button
                      onClick={() => setActiveTab("forgot-password")}
                      className="text-primary-600 hover:underline font-medium"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="text-sm text-gray-500 text-center">
                    Don't have an account?{" "}
                    <button
                      onClick={() => setActiveTab("register")}
                      className="text-primary-600 hover:underline font-medium"
                    >
                      Register
                    </button>
                  </div>
                </CardFooter>
              </Card>
            </TabsContent>
            
            {/* Forgot Password Form */}
            <TabsContent value="forgot-password">
              <Card>
                <CardHeader>
                  <CardTitle>Reset your password</CardTitle>
                  <CardDescription>
                    Enter your email address and we'll send you a link to reset your password
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...forgotPasswordForm}>
                    <form onSubmit={forgotPasswordForm.handleSubmit(onForgotPasswordSubmit)} className="space-y-4">
                      <FormField
                        control={forgotPasswordForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="Enter your email address" {...field} />
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
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Sending reset link...
                          </>
                        ) : (
                          "Send Reset Link"
                        )}
                      </Button>
                      
                      {/* Success message */}
                      {forgotPasswordSuccess && (
                        <Alert className="mt-4">
                          <CheckCircle className="h-4 w-4" />
                          <AlertTitle>Email Sent</AlertTitle>
                          <AlertDescription>{forgotPasswordSuccess}</AlertDescription>
                        </Alert>
                      )}
                      
                      {/* Error message */}
                      {forgotPasswordError && (
                        <Alert variant="destructive" className="mt-4">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Error</AlertTitle>
                          <AlertDescription>{forgotPasswordError}</AlertDescription>
                        </Alert>
                      )}
                    </form>
                  </Form>
                </CardContent>
                <CardFooter className="flex flex-col space-y-2">
                  <div className="text-sm text-gray-500 text-center">
                    Remember your password?{" "}
                    <button
                      onClick={() => setActiveTab("login")}
                      className="text-primary-600 hover:underline font-medium"
                    >
                      Back to Login
                    </button>
                  </div>
                  <div className="text-sm text-gray-500 text-center">
                    Don't have an account?{" "}
                    <button
                      onClick={() => setActiveTab("register")}
                      className="text-primary-600 hover:underline font-medium"
                    >
                      Register
                    </button>
                  </div>
                </CardFooter>
              </Card>
            </TabsContent>
            
            {/* Register Form */}
            <TabsContent value="register">
              <Card>
                <CardHeader>
                  <CardTitle>Create an account</CardTitle>
                  <CardDescription>
                    Enter your details to create a new account
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                      <FormField
                        control={registerForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input placeholder="John Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="john.doe@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={registerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input placeholder="johndoe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Create a password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={registerForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Confirm your password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="border-t mt-4 pt-4">
                        <h3 className="font-medium text-sm mb-3">Company Information</h3>
                        
                        <FormField
                          control={registerForm.control}
                          name="companyName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Company Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Your company name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={registerForm.control}
                          name="companyType"
                          render={({ field }) => (
                            <FormItem className="mt-4">
                              <FormLabel>Company Type</FormLabel>
                              <div className="flex space-x-4">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                  <input
                                    type="radio"
                                    className="form-radio h-4 w-4 text-primary"
                                    checked={field.value === "business"}
                                    onChange={() => field.onChange("business")}
                                  />
                                  <span>Business</span>
                                </label>
                                <label className="flex items-center space-x-2 cursor-pointer">
                                  <input
                                    type="radio"
                                    className="form-radio h-4 w-4 text-primary"
                                    checked={field.value === "individual"}
                                    onChange={() => field.onChange("individual")}
                                  />
                                  <span>Individual</span>
                                </label>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={registerForm.control}
                          name="taxIdNumber"
                          render={({ field }) => (
                            <FormItem className="mt-4">
                              <FormLabel>
                                {registerForm.watch("companyType") === "business" 
                                  ? "Tax ID Number" 
                                  : "TCKN (Turkish ID Number)"}
                              </FormLabel>
                              <FormControl>
                                <Input placeholder="Enter tax ID or TCKN" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="border-t mt-4 pt-4">
                          <h3 className="font-medium text-sm mb-3">Address Information (ShipEntegra Format)</h3>
                          
                          <FormField
                            control={registerForm.control}
                            name="address1"
                            render={({ field }) => (
                              <FormItem className="mt-2">
                                <FormLabel>
                                  Address <span className="text-xs text-muted-foreground">(Required, 35 chars max)</span>
                                </FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Address" 
                                    {...field} 
                                    maxLength={35}
                                    onChange={(e) => {
                                      // Auto update the legacy address field
                                      const address2 = registerForm.getValues("address2") || "";
                                      registerForm.setValue("address", e.target.value + (address2 ? ", " + address2 : ""));
                                      field.onChange(e);
                                    }}
                                  />
                                </FormControl>
                                <FormDescription className="text-xs">
                                  {field.value?.length || 0}/35 characters
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={registerForm.control}
                            name="address2"
                            render={({ field }) => (
                              <FormItem className="mt-2">
                                <FormLabel>
                                  Address Additional <span className="text-xs text-muted-foreground">(Optional, 35 chars max)</span>
                                </FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Additional address information" 
                                    {...field} 
                                    maxLength={35}
                                    onChange={(e) => {
                                      // Auto update the legacy address field
                                      const address1 = registerForm.getValues("address1") || "";
                                      registerForm.setValue("address", address1 + (e.target.value ? ", " + e.target.value : ""));
                                      field.onChange(e);
                                    }}
                                  />
                                </FormControl>
                                <FormDescription className="text-xs">
                                  {field.value?.length || 0}/35 characters
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <div className="grid grid-cols-2 gap-4 mt-2">
                            <FormField
                              control={registerForm.control}
                              name="city"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>City</FormLabel>
                                  <FormControl>
                                    <Input placeholder="City" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={registerForm.control}
                              name="postalCode"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Zip Code <span className="text-xs text-muted-foreground">(Required)</span></FormLabel>
                                  <FormControl>
                                    <Input placeholder="Zip code" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 mt-2">
                            <FormField
                              control={registerForm.control}
                              name="country"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Country</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Country" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={registerForm.control}
                              name="phone"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Phone Number</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Phone number" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          {/* Keep old address field hidden for compatibility */}
                          <input type="hidden" {...registerForm.register("address")} />
                        </div>
                        
                        <FormField
                          control={registerForm.control}
                          name="shipmentCapacity"
                          render={({ field }) => (
                            <FormItem className="mt-4">
                              <FormLabel>Monthly Shipment Capacity</FormLabel>
                              <FormControl>
                                <Input placeholder="Estimated monthly shipments" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <Button 
                        type="submit" 
                        className="w-full mt-6" 
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Registering...
                          </>
                        ) : (
                          "Register"
                        )}
                      </Button>
                      
                      {/* Registration success message */}
                      {registerSuccess && (
                        <Alert className="mt-4 bg-green-50 border-green-200 text-green-800">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <AlertTitle>Registration Successful</AlertTitle>
                          <AlertDescription>
                            {registerSuccess}
                          </AlertDescription>
                        </Alert>
                      )}
                      
                      {/* Registration error message */}
                      {registerError && (
                        <Alert variant="destructive" className="mt-4">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Registration Failed</AlertTitle>
                          <AlertDescription>{registerError}</AlertDescription>
                        </Alert>
                      )}
                    </form>
                  </Form>
                </CardContent>
                <CardFooter className="flex flex-col space-y-2">
                  <div className="text-sm text-gray-500 text-center">
                    Already have an account?{" "}
                    <button
                      onClick={() => setActiveTab("login")}
                      className="text-primary-600 hover:underline font-medium"
                    >
                      Login
                    </button>
                  </div>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      {/* Right column - Hero */}
      <div className="hidden lg:flex flex-1 bg-primary-700 items-center justify-center p-12">
        <div className="max-w-md text-white">
          <div className="flex mb-6">
            <TruckIcon className="h-16 w-16" />
          </div>
          <h2 className="text-4xl font-bold mb-4">Ship globally from Turkey</h2>
          <p className="text-lg mb-8 text-primary-100">
            Moogship helps you send packages worldwide with ease. Create shipments, 
            track them in real-time, and manage all your shipping needs from one place.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-primary-600 bg-opacity-30 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Individual Shipments</h3>
              <p className="text-sm text-primary-200">
                Create and manage shipments one by one with detailed tracking.
              </p>
            </div>
            <div className="bg-primary-600 bg-opacity-30 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Bulk Processing</h3>
              <p className="text-sm text-primary-200">
                Upload multiple shipments at once using Excel files.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
