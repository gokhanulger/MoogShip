import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
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
import { Loader2, Package, TruckIcon, Upload, AlertCircle, XCircle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import useEmblaCarousel from 'embla-carousel-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import moogshipLogo from "@/assets/moogship-logo.png.jpeg";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/language-switcher";

// Marketplace carousel component
const MarketplaceCarousel = () => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: true,
    align: 'center',
    slidesToScroll: 1,
    dragFree: true,
    containScroll: 'keepSnaps',
    skipSnaps: false
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    
    // Set up autoplay
    const intervalId = setInterval(() => {
      emblaApi.scrollNext();
    }, 3000);

    // Configure the carousel
    setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on('select', onSelect);
    onSelect();

    // Clean up
    return () => {
      clearInterval(intervalId);
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  const marketplaces = [
    { 
      name: "Amazon", 
      bgColor: "bg-[#232F3E]", 
      textColor: "text-[#FF9900]",
      fontWeight: "font-bold"
    },
    { 
      name: "Etsy", 
      bgColor: "bg-black", 
      textColor: "text-[#F56400]",
      fontWeight: "font-bold"
    },
    { 
      name: "Walmart", 
      bgColor: "bg-white", 
      textColor: "text-[#0071DC]",
      fontWeight: "font-bold"
    },
    { 
      name: "Wayfair", 
      bgColor: "bg-[#7b2288]", 
      textColor: "text-white",
      fontWeight: "font-bold"
    },
    { 
      name: "Shopify", 
      bgColor: "bg-white", 
      textColor: "text-[#95bf47]",
      fontWeight: "font-bold"
    },
  ];

  return (
    <div className="relative max-w-md mx-auto overflow-hidden">
      <div className="overflow-hidden rounded-xl" ref={emblaRef}>
        <div className="flex">
          {marketplaces.map((marketplace, index) => (
            <div 
              key={marketplace.name} 
              className="relative flex-grow-0 flex-shrink-0 basis-1/2 min-w-0 px-4 py-2"
            >
              <div 
                className={`h-24 w-48 ${marketplace.bgColor || 'bg-white'} rounded-xl flex items-center justify-center p-4 shadow-md hover:shadow-lg transition-all mx-auto ${
                  selectedIndex === index ? 'opacity-100 shadow-lg border border-blue-200' : 'opacity-90'
                }`}
              >
                <div className="relative w-full h-full flex items-center justify-center">
                  <span className={`text-center text-xl ${marketplace.fontWeight} ${
                    marketplace.textColor || (selectedIndex === index ? 'text-blue-600' : 'text-gray-700')
                  } transition-all duration-300 transform ${
                    selectedIndex === index ? 'scale-110' : 'scale-100'
                  }`}>
                    {marketplace.name}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Navigation dots */}
      <div className="flex justify-center mt-3">
        {scrollSnaps.map((_, index) => (
          <button
            key={index}
            className={`w-2 h-2 mx-1 rounded-full transition-all ${
              index === selectedIndex 
                ? 'bg-white transform scale-125' 
                : 'bg-white/50'
            }`}
            onClick={() => emblaApi?.scrollTo(index)}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

// Login form schema
const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Registration form schema
const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone number is required"),
  companyName: z.string().min(2, "Company name must be at least 2 characters"),
  companyType: z.enum(["business", "individual"], {
    errorMap: () => ({ message: "Please select company type" }),
  }), 
  taxIdNumber: z.string().min(1, "Tax ID is required"),
  // Legacy address field (can be empty if structured fields are used)
  address: z.string().optional(),
  // Structured address fields for ShipEntegra compatibility
  address1: z.string().min(1, "Address is required").max(35, "Address must be 35 characters or less"),
  address2: z.string().max(35, "Additional address must be 35 characters or less").optional(),
  city: z.string().min(1, "City is required"),
  postalCode: z.string().min(1, "Zip code is required"),
  country: z.string().min(1, "Country is required"),
  // Other fields
  shipmentCapacity: z.string().min(1, "Monthly shipment capacity is required"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState("login");
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [showPendingAlert, setShowPendingAlert] = useState(false);
  const [showLoginErrorAlert, setShowLoginErrorAlert] = useState(false);
  const [showRegisterErrorAlert, setShowRegisterErrorAlert] = useState(false);
  const [showRegisterSuccessAlert, setShowRegisterSuccessAlert] = useState(false);
  const [loginErrorMessage, setLoginErrorMessage] = useState("");
  const [registerErrorMessage, setRegisterErrorMessage] = useState("");
  const { toast } = useToast();
  const { t } = useTranslation();
  
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
      phone: "", // Initialize with empty string
      companyName: "",
      companyType: "business" as const,
      taxIdNumber: "",
      // Old legacy address field
      address: "",
      // New structured address fields for ShipEntegra
      address1: "",
      address2: "",
      city: "",
      postalCode: "",
      country: "",
      // Other fields
      shipmentCapacity: "",
    },
  });
  
  const onLoginSubmit = async (values: z.infer<typeof loginSchema>) => {
    setIsLoading(true);
    try {
      // Make API call to login
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
        credentials: 'include', // Important for cookies
      });
      
      if (response.ok) {
        const userData = await response.json();
        
        toast({
          title: "Login successful",
          description: `Welcome back, ${userData.name}!`,
          duration: 3000,
        });
        
        // Redirect to dashboard
        setLocation("/dashboard");
      } else {
        try {
          const errorData = await response.json();
          
          if (response.status === 403) {
            // Special case for accounts awaiting approval
            console.log("403 status detected - account pending approval");
            setShowPendingAlert(true);
          } else {
            throw new Error(errorData.message || "Login failed");
          }
        } catch (parseError) {
          console.error("Error parsing response:", parseError);
          // If the response is not JSON (e.g., HTML error page)
          throw new Error("Server error occurred. Please try again later.");
        }
      }
    } catch (error) {
      console.error("Login error:", error);
      // Show error in alert dialog instead of toast
      setLoginErrorMessage(error instanceof Error ? error.message : "Invalid username or password");
      setShowLoginErrorAlert(true);
    } finally {
      setIsLoading(false);
    }
  };
  
  const onRegisterSubmit = async (values: z.infer<typeof registerSchema>) => {
    setIsLoading(true);
    try {
      // Convert shipmentCapacity to a number
      const shipmentCapacity = parseInt(values.shipmentCapacity, 10);
      
      // Prepare data for API call 
      const userData = {
        username: values.username,
        password: values.password,
        name: values.name,
        email: values.email,
        phone: values.phone, // Include phone number
        companyName: values.companyName,
        companyType: values.companyType,
        taxIdNumber: values.taxIdNumber,
        // Include both legacy address field and structured address fields
        address: values.address,
        // New ShipEntegra compatible structured address fields
        address1: values.address1,
        address2: values.address2,
        city: values.city,
        postalCode: values.postalCode,
        country: values.country,
        // Other fields
        monthlyShipmentCapacity: isNaN(shipmentCapacity) ? 0 : shipmentCapacity
      };
      
      // Make API call to register user
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });
      
      if (response.ok) {
        // Show success in alert dialog instead of toast
        setShowRegisterSuccessAlert(true);
        
        // Reset form 
        // We'll switch to login tab after the success dialog is closed
        registerForm.reset();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Registration failed");
      }
    } catch (error) {
      console.error("Registration error:", error);
      // Show error in alert dialog instead of toast
      setRegisterErrorMessage(error instanceof Error ? error.message : "An unknown error occurred");
      setShowRegisterErrorAlert(true);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50/30 to-blue-50/50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 cursor-pointer" onClick={() => window.location.href = '/marketing'}>
                <img className="h-10 w-auto" src={moogshipLogo} alt="Moogship Logo" />
              </div>
              <div className="ml-3 text-lg font-medium text-blue-600 cursor-pointer" onClick={() => window.location.href = '/marketing'}>
                MoogShip
              </div>
            </div>
            
            <div className="flex items-center">
              {/* Language Switcher */}
              <div className="ml-4">
                <LanguageSwitcher size="sm" variant="ghost" />
              </div>
            </div>
          </div>
        </div>
      </header>
      
      {/* Alert Dialogs */}
      <AlertDialog open={showPendingAlert} onOpenChange={setShowPendingAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center text-amber-600">
              <AlertCircle className="h-5 w-5 mr-2" />
              Account Pending Approval
            </AlertDialogTitle>
            <AlertDialogDescription className="pt-2">
              <span>Your account is currently pending admin approval. You will be able to log in once your account has been approved.</span>
              <div className="mt-2 text-gray-700">
                If you need immediate assistance, please contact our support team.
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction className="bg-amber-500 hover:bg-amber-600">
              Understand
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={showLoginErrorAlert} onOpenChange={setShowLoginErrorAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center text-red-600">
              <XCircle className="h-5 w-5 mr-2" />
              Login Failed
            </AlertDialogTitle>
            <AlertDialogDescription className="pt-2">
              <span>{loginErrorMessage}</span>
              <div className="mt-2 text-gray-700">
                Please check your credentials and try again.
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction className="bg-red-500 hover:bg-red-600 text-white">
              I Understand
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={showRegisterErrorAlert} onOpenChange={setShowRegisterErrorAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center text-red-600">
              <XCircle className="h-5 w-5 mr-2" />
              Registration Failed
            </AlertDialogTitle>
            <AlertDialogDescription className="pt-2">
              <span>{registerErrorMessage}</span>
              <div className="mt-2 text-gray-700">
                Please check your information and try again.
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction className="bg-red-500 hover:bg-red-600 text-white">
              I Understand
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog 
        open={showRegisterSuccessAlert} 
        onOpenChange={(open) => {
          setShowRegisterSuccessAlert(open);
          // When dialog is closed, switch to login tab
          if (!open) {
            setActiveTab("login");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center text-green-600">
              <CheckCircle className="h-5 w-5 mr-2" />
              Registration Successful
            </AlertDialogTitle>
            <AlertDialogDescription className="pt-2">
              <span>Your account has been submitted for approval. You will be able to log in once your account has been approved.</span>
              <div className="mt-2 text-gray-700">
                Please check your email for further instructions.
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction className="bg-green-500 hover:bg-green-600 text-white">
              Continue to Login
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Main content */}
      <div className="flex-grow flex flex-col lg:flex-row">
        {/* Left column - Form */}
        <div className="flex-1 flex items-center justify-center p-4 lg:p-8">
          <div className="w-full max-w-md mx-auto">
            <div className="text-center mb-4">
              <div className="flex justify-center mb-2">
                <div className="p-1 bg-white rounded-lg shadow-sm">
                  <img src={moogshipLogo} alt="Moogship Logo" className="h-40 w-auto object-contain object-center" />
                </div>
              </div>
              <div className="h-1 w-32 bg-blue-400/80 rounded-full mx-auto mb-2"></div>
              <p className="text-gray-600 text-sm">Specialized for Amazon, Etsy, Shopify, Walmart, and Wayfair Sellers</p>
              <div className="mt-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                  onClick={() => window.location.href = '/marketing'}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                  </svg>
                  Back to Home
                </Button>
              </div>
            </div>
            
            <Tabs 
              defaultValue="login" 
              value={activeTab} 
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
              
              {/* Login Form */}
              <TabsContent value="login">
                <Card className="border shadow-lg rounded-xl">
                  <CardHeader className="pb-1 pt-3 px-4">
                    <CardTitle className="text-xl font-bold text-gray-900">Login to your account</CardTitle>
                    <CardDescription className="text-sm">
                      Enter your credentials to access your account
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-4 py-2">
                    <Form {...loginForm}>
                      <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-3">
                        <FormField
                          control={loginForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm">Username</FormLabel>
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
                              <FormLabel className="text-sm">Password</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="Enter your password" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <Button 
                          type="submit" 
                          className="w-full bg-gradient-to-r from-blue-400 to-blue-500 hover:from-blue-400 hover:to-blue-400 text-white font-medium py-2 shadow-sm" 
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
                      </form>
                    </Form>
                  </CardContent>
                  <CardFooter className="flex flex-col pt-0 pb-3 px-4">
                    <div className="text-sm text-gray-500 text-center">
                      Don't have an account?{" "}
                      <button
                        onClick={() => setActiveTab("register")}
                        className="text-blue-400 hover:underline font-medium"
                      >
                        Register
                      </button>
                    </div>
                  </CardFooter>
                </Card>
              </TabsContent>
              
              {/* Registration Form - Longer form with multiple fields */}
              <TabsContent value="register">
                <Card className="border shadow-lg rounded-xl">
                  <CardHeader className="pb-1 pt-3 px-4">
                    <CardTitle className="text-xl font-bold text-gray-900">Create an account</CardTitle>
                    <CardDescription className="text-sm">
                      Enter your details to create a new account
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-4 py-2">
                    <Form {...registerForm}>
                      <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-3">
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
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone Number <span className="text-red-500">*</span></FormLabel>
                              <FormControl>
                                <Input type="tel" placeholder="+90 XXX XXX XX XX" {...field} />
                              </FormControl>
                              <FormMessage />
                              <FormDescription className="text-xs">
                                Please include your country code (e.g., +90 for Turkey)
                              </FormDescription>
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
                        
                        <div className="border-t mt-3 pt-2">
                          <h3 className="font-medium text-sm mb-2">Company Information</h3>
                          
                          <FormField
                            control={registerForm.control}
                            name="companyName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm">Company Name</FormLabel>
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
                              <FormItem className="mt-3">
                                <FormLabel className="text-sm">Company Type</FormLabel>
                                <div className="flex space-x-4">
                                  <label className="flex items-center space-x-1 cursor-pointer">
                                    <input
                                      type="radio"
                                      className="form-radio h-4 w-4 text-primary"
                                      checked={field.value === "business"}
                                      onChange={() => field.onChange("business")}
                                    />
                                    <span className="text-sm">Business</span>
                                  </label>
                                  <label className="flex items-center space-x-1 cursor-pointer">
                                    <input
                                      type="radio"
                                      className="form-radio h-4 w-4 text-primary"
                                      checked={field.value === "individual"}
                                      onChange={() => field.onChange("individual")}
                                    />
                                    <span className="text-sm">Individual</span>
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
                              <FormItem className="mt-3">
                                <FormLabel className="text-sm">Tax ID Number</FormLabel>
                                <FormControl>
                                  <Input placeholder="Tax ID / VAT Number" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="border-t mt-3 pt-2">
                          <h3 className="font-medium text-sm mb-2">Address Information</h3>
                          
                          <FormField
                            control={registerForm.control}
                            name="address1"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm">Address Line 1</FormLabel>
                                <FormControl>
                                  <Input placeholder="Primary address line" {...field} />
                                </FormControl>
                                <FormMessage />
                                <FormDescription className="text-xs">
                                  Maximum 35 characters for compatibility with shipping providers
                                </FormDescription>
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={registerForm.control}
                            name="address2"
                            render={({ field }) => (
                              <FormItem className="mt-3">
                                <FormLabel className="text-sm">Address Line 2 (Optional)</FormLabel>
                                <FormControl>
                                  <Input placeholder="Secondary address line (optional)" {...field} />
                                </FormControl>
                                <FormMessage />
                                <FormDescription className="text-xs">
                                  Maximum 35 characters for compatibility with shipping providers
                                </FormDescription>
                              </FormItem>
                            )}
                          />
                          
                          <div className="grid grid-cols-2 gap-3 mt-3">
                            <FormField
                              control={registerForm.control}
                              name="city"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-sm">City</FormLabel>
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
                                  <FormLabel className="text-sm">Postal Code</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Postal code" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <FormField
                            control={registerForm.control}
                            name="country"
                            render={({ field }) => (
                              <FormItem className="mt-3">
                                <FormLabel className="text-sm">Country</FormLabel>
                                <FormControl>
                                  <Input placeholder="Country" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="border-t mt-3 pt-2">
                          <h3 className="font-medium text-sm mb-2">Shipping Information</h3>
                          
                          <FormField
                            control={registerForm.control}
                            name="shipmentCapacity"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm">Monthly Shipment Volume</FormLabel>
                                <FormControl>
                                  <Input type="number" placeholder="Estimated monthly shipments" {...field} />
                                </FormControl>
                                <FormMessage />
                                <FormDescription className="text-xs">
                                  Approximate number of shipments per month
                                </FormDescription>
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <Button 
                          type="submit" 
                          className="w-full mt-4 bg-gradient-to-r from-blue-400 to-blue-500 hover:from-blue-400 hover:to-blue-400 text-white font-medium py-2 shadow-sm" 
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
                      </form>
                    </Form>
                  </CardContent>
                  <CardFooter className="flex flex-col pt-0 pb-3 px-4">
                    <div className="text-sm text-gray-500 text-center">
                      Already have an account?{" "}
                      <button
                        onClick={() => setActiveTab("login")}
                        className="text-blue-400 hover:underline font-medium"
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
        <div className="flex-1 bg-gradient-to-br from-blue-500 to-blue-600 p-8 flex items-center justify-center lg:flex">
          <div className="max-w-md">
            <div className="flex justify-center mb-4">
              <div className="bg-white p-2 rounded-xl shadow-lg">
                <img src="/images/moogship-boxes.png" alt="Moogship Logo" className="h-52 w-auto object-contain object-center" />
              </div>
            </div>
            <h2 className="text-4xl font-bold mb-4 text-white text-center">E-commerce Global Shipping</h2>
            <div className="h-1 w-32 bg-white rounded-full mx-auto mb-4"></div>
            <p className="text-lg mb-6 text-blue-100 leading-relaxed text-center">
              Moogship helps Amazon, Etsy, Shopify, Walmart, and Wayfair sellers ship packages globally
              from Turkey with ease. Track in real-time and manage all shipping needs from one place.
            </p>
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white/20 p-6 rounded-2xl border border-white/20 shadow-lg backdrop-blur-sm">
                <div className="flex justify-center mb-3">
                  <div className="h-12 w-12 bg-white rounded-full flex items-center justify-center shadow-md">
                    <Package className="h-6 w-6 text-blue-500" />
                  </div>
                </div>
                <h3 className="font-semibold text-xl mb-2 text-white text-center">E-commerce Shipping</h3>
                <p className="text-sm text-blue-50 text-center leading-relaxed">
                  Easily manage marketplace orders with specialized shipping solutions.
                </p>
              </div>
              <div className="bg-white/20 p-6 rounded-2xl border border-white/20 shadow-lg backdrop-blur-sm">
                <div className="flex justify-center mb-3">
                  <div className="h-12 w-12 bg-white rounded-full flex items-center justify-center shadow-md">
                    <TruckIcon className="h-6 w-6 text-blue-500" />
                  </div>
                </div>
                <h3 className="font-semibold text-xl mb-2 text-white text-center">Marketplace Integration</h3>
                <p className="text-sm text-blue-50 text-center leading-relaxed">
                  Seamlessly connect your Amazon, Etsy, Shopify, Walmart, and Wayfair stores.
                </p>
              </div>
            </div>
            <div className="mt-10 text-center">
              <h4 className="text-white font-medium mb-4 text-lg">Serving sellers from top marketplaces</h4>
              <MarketplaceCarousel />
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center mb-8">
            <div className="flex items-center mb-4 md:mb-0">
              <img 
                src={moogshipLogo} 
                alt="Moogship Logo" 
                className="h-8 w-auto bg-white p-1 rounded cursor-pointer"
                onClick={() => window.location.href = '/marketing'} 
              />
              <div 
                className="ml-2 text-lg font-bold bg-gradient-to-r from-blue-300 to-blue-100 bg-clip-text text-transparent cursor-pointer"
                onClick={() => window.location.href = '/marketing'}
              >
                MoogShip
              </div>
            </div>
            
            <div className="flex space-x-6">
              <span 
                onClick={() => window.location.href = '/marketing'} 
                className="text-gray-400 hover:text-white cursor-pointer text-sm"
              >
                Home
              </span>
              <span 
                onClick={() => window.location.href = '/marketing-price-calculator'} 
                className="text-gray-400 hover:text-white cursor-pointer text-sm"
              >
                Price Calculator
              </span>
              <span 
                onClick={() => window.location.href = '/about'} 
                className="text-gray-400 hover:text-white cursor-pointer text-sm"
              >
                About
              </span>
              <span 
                onClick={() => window.location.href = '/contact'} 
                className="text-gray-400 hover:text-white cursor-pointer text-sm"
              >
                Contact
              </span>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-6 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm mb-4 md:mb-0">&copy; 2025 <span className="bg-gradient-to-r from-blue-300 to-blue-100 bg-clip-text text-transparent">MoogShip</span>. {t('marketing.footer.allRightsReserved', 'All rights reserved')}</p>
            <div className="flex space-x-4">
              <span onClick={() => window.location.href = '/legal/terms'} className="text-gray-400 hover:text-white text-sm cursor-pointer">Terms</span>
              <span onClick={() => window.location.href = '/legal/privacy'} className="text-gray-400 hover:text-white text-sm cursor-pointer">Privacy</span>
              <span onClick={() => window.location.href = '/legal/cookies'} className="text-gray-400 hover:text-white text-sm cursor-pointer">Cookies</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}