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
import { Loader2, Package, TruckIcon, Upload, AlertCircle, XCircle, CheckCircle, Mail, UserCheck, Eye, EyeOff } from "lucide-react";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ResendVerification } from "@/components/resend-verification";
import moogshipLogo from "@/assets/moogship-logo.png.jpeg";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/language-switcher";
import { apiFetch } from "@/lib/api-config";
import { useAuth } from "@/hooks/use-auth";

// Password Input Component with show/hide toggle
const PasswordInput = ({ 
  showPassword, 
  onTogglePassword, 
  placeholder,
  field,
  autoComplete 
}: {
  showPassword: boolean;
  onTogglePassword: () => void;
  placeholder: string;
  field: any;
  autoComplete?: string;
}) => {
  return (
    <div className="relative">
      <Input
        type={showPassword ? "text" : "password"}
        placeholder={placeholder}
        autoComplete={autoComplete}
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        data-form-type="other"
        data-lpignore="true"
        data-1p-ignore="true"
        {...field}
        className="pr-10"
      />
      <button
        type="button"
        onClick={onTogglePassword}
        className="absolute inset-y-0 right-0 pr-3 flex items-center"
      >
        {showPassword ? (
          <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600" />
        ) : (
          <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600" />
        )}
      </button>
    </div>
  );
};

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

// Login form schema - Maximum compatibility for iOS simulator
const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
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
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [showPendingAlert, setShowPendingAlert] = useState(false);
  const [showLoginErrorAlert, setShowLoginErrorAlert] = useState(false);
  const [showRegisterErrorAlert, setShowRegisterErrorAlert] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showRegisterSuccessAlert, setShowRegisterSuccessAlert] = useState(false);
  const [loginErrorMessage, setLoginErrorMessage] = useState("");
  const [registerErrorMessage, setRegisterErrorMessage] = useState("");
  const [showVerificationAlert, setShowVerificationAlert] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState<string | null>(null);
  const [forgotPasswordError, setForgotPasswordError] = useState<string | null>(null);
  const { toast } = useToast();
  const { t } = useTranslation();
  
  // Handle auth hooks safely - check if we're in AuthProvider context
  let loginMutation, registerMutation;
  try {
    const auth = useAuth();
    loginMutation = auth.loginMutation;
    registerMutation = auth.registerMutation;
  } catch (error) {
    // If we're not in AuthProvider context, create fallback mutations
    loginMutation = { mutate: () => {}, isPending: false };
    registerMutation = { mutate: () => {}, isPending: false };
  }
  
  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });
  
  // Reset login form when component mounts or when switching to login tab
  // This ensures the form is always cleared and prevents browser autofill issues
  useEffect(() => {
    if (activeTab === "login") {
      loginForm.reset({
        username: "",
        password: "",
      });
    }
  }, [activeTab]);
  
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
      // Make API call to login using the enhanced fetch function
      const response = await apiFetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
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
          
          if (response.status === 401) {
            // Check if the error message contains anything about approval
            if (errorData.message && errorData.message.toLowerCase().includes("approval")) {
              // This is an account pending approval case
              console.log("Account pending approval detected");
              setShowPendingAlert(true);
              return; // Exit early to avoid showing the general login error
            } 
            // Check if the error is about email verification
            else if (errorData.message && errorData.message.toLowerCase().includes("email verification") && errorData.email) {
              // This is an email not verified case
              console.log("Email verification required detected");
              setVerificationEmail(errorData.email);
              setShowVerificationAlert(true);
              return; // Exit early to avoid showing the general login error
            } else {
              // Regular authentication error (wrong username/password)
              throw new Error(errorData.message || "Invalid username or password");
            }
          } else if (response.status === 403) {
            // Special case for accounts awaiting approval or email verification
            if (errorData.message && errorData.message.toLowerCase().includes("email verification") && errorData.email) {
              console.log("403 status - email verification required");
              setVerificationEmail(errorData.email);
              setShowVerificationAlert(true);
            } else {
              console.log("403 status detected - account pending approval");
              setShowPendingAlert(true);
            }
          } else {
            throw new Error(errorData.message || t('auth.alerts.loginFailed.description', 'Girdiğiniz kullanıcı adı veya şifre yanlış.'));
          }
        } catch (parseError) {
          console.error("Error parsing response:", parseError);
          // If the response is not JSON, just show the translated generic error message
          throw new Error(t('auth.alerts.loginFailed.description', 'Girdiğiniz kullanıcı adı veya şifre yanlış.'));
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
      const response = await apiFetch('/api/register', {
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
              {t('auth.alerts.accountPendingApproval.title', 'Account Pending Approval')}
            </AlertDialogTitle>
            <AlertDialogDescription className="pt-2">
              <p>
                {t('auth.alerts.accountPendingApproval.description', 'Your account is currently pending admin approval. You will be able to log in once your account has been approved.')}
              </p>
              <p className="mt-2 text-gray-700">
                {t('auth.alerts.accountPendingApproval.supportInfo', 'If you need immediate assistance, please contact our support team.')}
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction className="bg-amber-500 hover:bg-amber-600">
              {t('auth.alerts.accountPendingApproval.actionButton', 'I Understand')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={showVerificationAlert} onOpenChange={setShowVerificationAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center text-blue-600">
              <Mail className="h-5 w-5 mr-2" />
              {t('auth.alerts.emailVerification.title', 'Email Verification Required')}
            </AlertDialogTitle>
            <AlertDialogDescription className="pt-2">
              <p>
                {t('auth.alerts.emailVerification.description', 'You need to verify your email address before you can log in. Please check your email for a verification link.')}
              </p>
              <p className="mt-4 text-gray-700">
                {t('auth.alerts.emailVerification.resendInfo', "Didn't receive the email? You can request a new verification email below.")}
              </p>
              
              <div className="mt-4">
                <Alert className="bg-blue-50 border-blue-200 text-blue-800 mb-4">
                  <Mail className="h-4 w-4 text-blue-800" />
                  <AlertTitle>Verification Email Address</AlertTitle>
                  <AlertDescription>
                    {verificationEmail}
                  </AlertDescription>
                </Alert>
                
                <ResendVerification email={verificationEmail} />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction className="bg-blue-500 hover:bg-blue-600 text-white">
              {t('auth.alerts.emailVerification.actionButton', 'Close')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={showLoginErrorAlert} onOpenChange={setShowLoginErrorAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center text-red-600">
              <XCircle className="h-5 w-5 mr-2" />
              {t('auth.alerts.loginFailed.title', 'Login Failed')}
            </AlertDialogTitle>
            <AlertDialogDescription className="pt-2">
                {loginErrorMessage || t('auth.alerts.loginFailed.description', 'Girdiğiniz kullanıcı adı veya şifre yanlış.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction className="bg-red-500 hover:bg-red-600 text-white">
              {t('auth.alerts.loginFailed.actionButton', 'Try Again')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={showRegisterErrorAlert} onOpenChange={setShowRegisterErrorAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center text-red-600">
              <XCircle className="h-5 w-5 mr-2" />
              {t('auth.alerts.registration.failedTitle', 'Registration Failed')}
            </AlertDialogTitle>
            <AlertDialogDescription className="pt-2">
                {registerErrorMessage && registerErrorMessage.includes('email') 
                  ? t('auth.alerts.registration.emailExists', 'This email address is already registered. Please use a different email or try to login.')
                  : registerErrorMessage && registerErrorMessage.includes('username')
                  ? t('auth.alerts.registration.usernameExists', 'This username is already taken. Please choose a different username.')
                  : registerErrorMessage
                }
              
              <div className="mt-2 text-gray-700">
                {t('auth.alerts.registration.failedDescription', 'Please check your information and try again.')}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction className="bg-red-500 hover:bg-red-600 text-white">
              {t('auth.alerts.registration.actionButton', 'I Understand')}
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
              {t('auth.alerts.registrationSuccess.title', 'Registration Successful')}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="pt-2">
                <div className="text-base">
                  {t('auth.alerts.registrationSuccess.description', 'Hesabınız oluşturuldu. Sisteme giriş yapabilmek için iki aşamayı tamamlamanız gerekmektedir:')}
                </div>
              
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex">
                    <Mail className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-blue-800 text-sm font-medium mb-1">
                        1. E-posta Doğrulama
                      </div>
                      <div className="text-blue-700 text-sm">
                        Lütfen e-posta kutunuzu kontrol edin ve doğrulama bağlantısına tıklayın.
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <div className="flex">
                    <UserCheck className="h-5 w-5 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-amber-800 text-sm font-medium mb-1">
                        2. Yönetici Onayı
                      </div>
                      <div className="text-amber-700 text-sm">
                        E-posta doğrulaması tamamlandıktan sonra hesabınızın yönetici tarafından onaylanması gerekmektedir.
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-3 text-gray-700 text-sm">
                  Her iki işlem tamamlandıktan sonra sisteme giriş yapabilirsiniz. Sorularınız için lütfen bizimle iletişime geçin.
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction className="bg-green-500 hover:bg-green-600 text-white">
              {t('auth.alerts.registrationSuccess.actionButton', 'Continue to Login')}
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
                  <img src={moogshipLogo} alt={t('auth.logo.alt', 'Moogship Logo')} className="h-40 w-auto object-contain object-center" />
                </div>
              </div>
              <div className="h-1 w-32 bg-blue-400/80 rounded-full mx-auto mb-2"></div>
              <p className="text-gray-600 text-sm">{t('auth.specialization', 'Specialized for Amazon, Etsy, Shopify, Walmart, and Wayfair Sellers')}</p>
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
                  {t('auth.backToHome', 'Back to Home')}
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
                <TabsTrigger value="login">{t('auth.login.tab', 'Login')}</TabsTrigger>
                <TabsTrigger value="register">{t('auth.register.tab', 'Register')}</TabsTrigger>
              </TabsList>
              
              {/* Login Form */}
              <TabsContent value="login">
                <Card className="border shadow-lg rounded-xl">
                  <CardHeader className="pb-1 pt-3 px-4">
                    <CardTitle className="text-xl font-bold text-gray-900">{t('auth.login.title', 'Login to your account')}</CardTitle>
                    <CardDescription className="text-sm">
                      {t('auth.login.description', 'Enter your credentials to access your account')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-4 py-2">
                    {/* Hidden dummy form to trick Chrome auto-fill */}
                    <div style={{ position: 'absolute', left: '-9999px', visibility: 'hidden' }}>
                      <input type="text" name="fake_username" autoComplete="username" />
                      <input type="password" name="fake_password" autoComplete="current-password" />
                    </div>
                    
                    <Form {...loginForm}>
                      <form 
                        onSubmit={loginForm.handleSubmit(onLoginSubmit)} 
                        className="space-y-3"
                        autoComplete="off"
                      >
                        <FormField
                          control={loginForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm">{t('auth.login.username', 'Username')}</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder={t('auth.login.usernamePlaceholder', 'Enter your username')} 
                                  autoComplete="new-password"
                                  autoCorrect="off"
                                  autoCapitalize="off"
                                  spellCheck="false"
                                  data-form-type="other"
                                  data-lpignore="true"
                                  data-1p-ignore="true"
                                  {...field} 
                                />
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
                              <FormLabel className="text-sm">{t('auth.login.password', 'Password')}</FormLabel>
                              <FormControl>
                                <PasswordInput
                                  showPassword={showLoginPassword}
                                  onTogglePassword={() => setShowLoginPassword(!showLoginPassword)}
                                  placeholder={t('auth.login.passwordPlaceholder', 'Enter your password')}
                                  field={field}
                                  autoComplete="current-password"
                                />
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
                              {t('auth.login.loggingIn', 'Logging in...')}
                            </>
                          ) : (
                            t('auth.login.loginButton', 'Login')
                          )}
                        </Button>
                        
                        {/* Chrome Mobile Debug Info */}
                        {typeof window !== 'undefined' && navigator.userAgent.includes('Chrome') && navigator.userAgent.includes('Mobile') && (
                          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                            Chrome Mobile detected - Enhanced debugging enabled
                          </div>
                        )}
                      </form>
                    </Form>
                    
                    <div className="text-center pt-3">
                      <button
                        type="button"
                        onClick={() => setLocation("/forgot-password")}
                        className="text-sm text-blue-600 hover:text-blue-800 underline"
                      >
                        {t('auth.login.forgotPassword')}
                      </button>
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col pt-0 pb-3 px-4">
                    <div className="text-sm text-gray-500 text-center">
                      {t('auth.login.noAccount', 'Don\'t have an account?')}{" "}
                      <button
                        onClick={() => setActiveTab("register")}
                        className="text-blue-400 hover:underline font-medium"
                      >
                        {t('auth.login.registerLink', 'Register')}
                      </button>
                    </div>
                  </CardFooter>
                </Card>
              </TabsContent>
              
              {/* Registration Form - Longer form with multiple fields */}
              <TabsContent value="register">
                <Card className="border shadow-lg rounded-xl">
                  <CardHeader className="pb-1 pt-3 px-4">
                    <CardTitle className="text-xl font-bold text-gray-900">{t('auth.register.title', 'Create an account')}</CardTitle>
                    <CardDescription className="text-sm">
                      {t('auth.register.description', 'Enter your details to create a new account')}
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
                              <FormLabel>{t('auth.register.fullName', 'Full Name')}</FormLabel>
                              <FormControl>
                                <Input placeholder={t('auth.register.fullNamePlaceholder', 'John Doe')} {...field} />
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
                              <FormLabel>{t('auth.register.email', 'Email')}</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder={t('auth.register.emailPlaceholder', 'john.doe@example.com')} {...field} />
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
                              <FormLabel>{t('auth.register.phone', 'Phone Number')} <span className="text-red-500">*</span></FormLabel>
                              <FormControl>
                                <Input type="tel" placeholder={t('auth.register.phonePlaceholder', '+90 XXX XXX XX XX')} {...field} />
                              </FormControl>
                              <FormMessage />
                              <FormDescription className="text-xs">
                                {t('auth.register.phoneHelp', 'Please include your country code (e.g., +90 for Turkey)')}
                              </FormDescription>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={registerForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('auth.register.username', 'Username')}</FormLabel>
                              <FormControl>
                                <Input placeholder={t('auth.register.usernamePlaceholder', 'johndoe')} {...field} />
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
                              <FormLabel>{t('auth.register.password', 'Password')}</FormLabel>
                              <FormControl>
                                <PasswordInput
                                  showPassword={showRegisterPassword}
                                  onTogglePassword={() => setShowRegisterPassword(!showRegisterPassword)}
                                  placeholder={t('auth.register.passwordPlaceholder', 'Create a password')}
                                  field={field}
                                  autoComplete="new-password"
                                />
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
                              <FormLabel>{t('auth.register.confirmPassword', 'Confirm Password')}</FormLabel>
                              <FormControl>
                                <PasswordInput
                                  showPassword={showConfirmPassword}
                                  onTogglePassword={() => setShowConfirmPassword(!showConfirmPassword)}
                                  placeholder={t('auth.register.confirmPasswordPlaceholder', 'Confirm your password')}
                                  field={field}
                                  autoComplete="new-password"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="border-t mt-3 pt-2">
                          <h3 className="font-medium text-sm mb-2">{t('auth.register.companySection', 'Company Information')}</h3>
                          
                          <FormField
                            control={registerForm.control}
                            name="companyName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm">{t('auth.register.companyName', 'Company Name')}</FormLabel>
                                <FormControl>
                                  <Input placeholder={t('auth.register.companyNamePlaceholder', 'Your company name')} {...field} />
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
                                <FormLabel className="text-sm">{t('auth.register.companyType', 'Company Type')}</FormLabel>
                                <div className="flex space-x-4">
                                  <label className="flex items-center space-x-1 cursor-pointer">
                                    <input
                                      type="radio"
                                      className="form-radio h-4 w-4 text-primary"
                                      checked={field.value === "business"}
                                      onChange={() => field.onChange("business")}
                                    />
                                    <span className="text-sm">{t('auth.register.companyTypeBusiness', 'Business')}</span>
                                  </label>
                                  <label className="flex items-center space-x-1 cursor-pointer">
                                    <input
                                      type="radio"
                                      className="form-radio h-4 w-4 text-primary"
                                      checked={field.value === "individual"}
                                      onChange={() => field.onChange("individual")}
                                    />
                                    <span className="text-sm">{t('auth.register.companyTypeIndividual', 'Individual')}</span>
                                  </label>
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={registerForm.control}
                            name="taxIdNumber"
                            render={({ field }) => {
                              // Get the current value of companyType from the form
                              const companyType = registerForm.watch("companyType");
                              
                              return (
                                <FormItem className="mt-3">
                                  <FormLabel className="text-sm">
                                    {companyType === "individual" 
                                      ? t('auth.register.tckn', 'Turkish ID Number (TCKN)') 
                                      : t('auth.register.taxId', 'Tax ID Number')}
                                  </FormLabel>
                                  <FormControl>
                                    <Input 
                                      placeholder={companyType === "individual" 
                                        ? t('auth.register.tcknPlaceholder', '11-digit Turkish Identification Number') 
                                        : t('auth.register.taxIdPlaceholder', 'Tax ID / VAT Number')} 
                                      {...field} 
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              );
                            }}
                          />
                        </div>
                        
                        <div className="border-t mt-3 pt-2">
                          <h3 className="font-medium text-sm mb-2">{t('auth.register.addressSection', 'Address Information')}</h3>
                          
                          <FormField
                            control={registerForm.control}
                            name="address1"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm">{t('auth.register.addressLine1', 'Address Line 1')}</FormLabel>
                                <FormControl>
                                  <Input placeholder={t('auth.register.addressLine1Placeholder', 'Primary address line')} {...field} />
                                </FormControl>
                                <FormMessage />
                                <FormDescription className="text-xs">
                                  {t('auth.register.addressCharLimit', 'Maximum 35 characters for compatibility with shipping providers')}
                                </FormDescription>
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={registerForm.control}
                            name="address2"
                            render={({ field }) => (
                              <FormItem className="mt-3">
                                <FormLabel className="text-sm">{t('auth.register.addressLine2', 'Address Line 2 (Optional)')}</FormLabel>
                                <FormControl>
                                  <Input placeholder={t('auth.register.addressLine2Placeholder', 'Secondary address line (optional)')} {...field} />
                                </FormControl>
                                <FormMessage />
                                <FormDescription className="text-xs">
                                  {t('auth.register.addressCharLimit', 'Maximum 35 characters for compatibility with shipping providers')}
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
                                  <FormLabel className="text-sm">{t('auth.register.city', 'City')}</FormLabel>
                                  <FormControl>
                                    <Input placeholder={t('auth.register.cityPlaceholder', 'City')} {...field} />
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
                                  <FormLabel className="text-sm">{t('auth.register.postalCode', 'Postal Code')}</FormLabel>
                                  <FormControl>
                                    <Input placeholder={t('auth.register.postalCodePlaceholder', 'Postal code')} {...field} />
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
                                <FormLabel className="text-sm">{t('auth.register.country', 'Country')}</FormLabel>
                                <FormControl>
                                  <Input placeholder={t('auth.register.countryPlaceholder', 'Country')} {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="border-t mt-3 pt-2">
                          <h3 className="font-medium text-sm mb-2">{t('auth.register.shippingSection', 'Shipping Information')}</h3>
                          
                          <FormField
                            control={registerForm.control}
                            name="shipmentCapacity"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm">{t('auth.register.monthlyShipmentVolume', 'Monthly Shipment Volume')}</FormLabel>
                                <FormControl>
                                  <Input type="number" placeholder={t('auth.register.monthlyShipmentVolumePlaceholder', 'Estimated monthly shipments')} {...field} />
                                </FormControl>
                                <FormMessage />
                                <FormDescription className="text-xs">
                                  {t('auth.register.monthlyShipmentVolumeHelp', 'Approximate number of shipments per month')}
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
                              {t('auth.register.registering', 'Registering...')}
                            </>
                          ) : (
                            t('auth.register.registerButton', 'Register')
                          )}
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                  <CardFooter className="flex flex-col pt-0 pb-3 px-4">
                    <div className="text-sm text-gray-500 text-center">
                      {t('auth.register.haveAccount', 'Already have an account?')}{" "}
                      <button
                        onClick={() => setActiveTab("login")}
                        className="text-blue-400 hover:underline font-medium"
                      >
                        {t('auth.register.loginLink', 'Login')}
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
                <img src="/images/moogship-boxes.png" alt={t('auth.hero.logoAlt', 'Moogship Logo')} className="h-52 w-auto object-contain object-center" />
              </div>
            </div>
            <h2 className="text-4xl font-bold mb-4 text-white text-center">{t('auth.hero.title', 'E-commerce Global Shipping')}</h2>
            <div className="h-1 w-32 bg-white rounded-full mx-auto mb-4"></div>
            <p className="text-lg mb-6 text-blue-100 leading-relaxed text-center">
              {t('auth.hero.description', 'Moogship helps Amazon, Etsy, Shopify, Walmart, and Wayfair sellers ship packages globally from Turkey with ease. Track in real-time and manage all shipping needs from one place.')}
            </p>
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white/20 p-6 rounded-2xl border border-white/20 shadow-lg backdrop-blur-sm">
                <div className="flex justify-center mb-3">
                  <div className="h-12 w-12 bg-white rounded-full flex items-center justify-center shadow-md">
                    <Package className="h-6 w-6 text-blue-500" />
                  </div>
                </div>
                <h3 className="font-semibold text-xl mb-2 text-white text-center">{t('auth.hero.feature1Title', 'E-commerce Shipping')}</h3>
                <p className="text-sm text-blue-50 text-center leading-relaxed">
                  {t('auth.hero.feature1Description', 'Easily manage marketplace orders with specialized shipping solutions.')}
                </p>
              </div>
              <div className="bg-white/20 p-6 rounded-2xl border border-white/20 shadow-lg backdrop-blur-sm">
                <div className="flex justify-center mb-3">
                  <div className="h-12 w-12 bg-white rounded-full flex items-center justify-center shadow-md">
                    <TruckIcon className="h-6 w-6 text-blue-500" />
                  </div>
                </div>
                <h3 className="font-semibold text-xl mb-2 text-white text-center">{t('auth.hero.feature2Title', 'Marketplace Integration')}</h3>
                <p className="text-sm text-blue-50 text-center leading-relaxed">
                  {t('auth.hero.feature2Description', 'Seamlessly connect your Amazon, Etsy, Shopify, Walmart, and Wayfair stores.')}
                </p>
              </div>
            </div>
            <div className="mt-10 text-center">
              <h4 className="text-white font-medium mb-4 text-lg">{t('auth.hero.marketplacesTitle', 'Serving sellers from top marketplaces')}</h4>
              <MarketplaceCarousel />
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center mb-4">
                <img 
                  src={moogshipLogo} 
                  alt={t('auth.footer.logoAlt', 'Moogship Logo')} 
                  className="h-10 w-auto bg-white p-1 rounded cursor-pointer" 
                  onClick={() => window.location.href = '/marketing'}
                />
              </div>
              <p className="text-gray-400 mb-4">
                {t('marketing.footer.description', 'Global shipping logistics platform for businesses of all sizes.')}
              </p>
              <div className="flex space-x-4">
                {['facebook', 'twitter', 'linkedin', 'instagram'].map((social) => (
                  <span 
                    key={social} 
                    onClick={() => window.open(`https://www.${social}.com/moogship`, '_blank')}
                    className="text-gray-400 hover:text-white cursor-pointer"
                  >
                    <span className="sr-only">{t(`auth.footer.socialMedia.${social}`, social)}</span>
                    <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center">
                      <span className="text-sm">{t(`auth.footer.socialMedia.${social}Initial`, social[0].toUpperCase())}</span>
                    </div>
                  </span>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-4">{t('marketing.footer.company', 'Company')}</h3>
              <ul className="space-y-2">
                {(t('marketing.footer.companyLinks', { returnObjects: true, defaultValue: ['About Us', 'Our Team', 'Careers'] }) as string[]).map((item: string) => (
                  <li key={item}>
                    <span 
                      onClick={() => window.location.href = '/about'} 
                      className="text-gray-400 hover:text-white cursor-pointer"
                    >{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-4">{t('marketing.footer.services', 'Services')}</h3>
              <ul className="space-y-2">
                {(t('marketing.footer.serviceLinks', { returnObjects: true, defaultValue: ['Global Shipping', 'Tracking', 'Support'] }) as string[]).map((item: string) => (
                  <li key={item}>
                    <span 
                      onClick={() => window.location.href = '/services'} 
                      className="text-gray-400 hover:text-white cursor-pointer"
                    >{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-4">{t('marketing.footer.legal', 'Legal')}</h3>
              <ul className="space-y-2">
                {(t('marketing.footer.legalLinks', { returnObjects: true, defaultValue: ['Privacy Policy', 'Terms of Service', 'Cookie Policy'] }) as string[]).map((item: string) => (
                  <li key={item}>
                    <span 
                      onClick={() => window.location.href = '/legal'} 
                      className="text-gray-400 hover:text-white cursor-pointer"
                    >{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">&copy; 2025 MoogShip. {t('marketing.footer.allRightsReserved', 'All rights reserved')}</p>
            <div className="mt-4 md:mt-0 flex space-x-4">
              <span onClick={() => window.location.href = '/legal/terms'} className="text-gray-400 hover:text-white text-sm cursor-pointer">{t('marketing.footer.terms', 'Terms')}</span>
              <span onClick={() => window.location.href = '/legal/privacy'} className="text-gray-400 hover:text-white text-sm cursor-pointer">{t('marketing.footer.privacy', 'Privacy')}</span>
              <span onClick={() => window.location.href = '/legal/cookies'} className="text-gray-400 hover:text-white text-sm cursor-pointer">{t('marketing.footer.cookies', 'Cookies')}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}