import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle, AlertTriangle, XCircle, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";

export default function VerificationResult() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const [status, setStatus] = useState<"success" | "pending" | "error" | "loading">("loading");
  const [message, setMessage] = useState<string>("");
  
  // Get query params to check status and message
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const statusParam = urlParams.get("status");
    const messageParam = urlParams.get("message");
    
    if (statusParam === "success" || statusParam === "pending" || statusParam === "error") {
      setStatus(statusParam);
    } else {
      setStatus("error");
    }
    
    if (messageParam) {
      setMessage(decodeURIComponent(messageParam));
    } else {
      // Default messages based on status
      if (status === "pending") {
        setMessage("Your email has been verified successfully. Your account is pending admin approval.");
      } else if (status === "error") {
        setMessage("There was a problem verifying your email. The verification link may be expired or invalid.");
      } else if (status === "success") {
        setMessage("Your email has been verified successfully. You can now log in.");
      } else {
        setMessage("Checking verification status...");
      }
    }
  }, [status]);
  
  const handleGoToLogin = () => {
    navigate("/auth");
  };
  
  const handleReverify = () => {
    navigate("/auth?requestVerification=true");
  };
  
  // Define alert styling based on status
  const getAlertStyles = () => {
    switch (status) {
      case "loading":
        return {
          variant: "default",
          bgColor: "bg-gray-50",
          borderColor: "border-gray-200",
          textColor: "text-gray-800",
          iconColor: "text-gray-600",
          titleColor: "text-gray-700",
          Icon: Loader2
        };
      case "error":
        return {
          variant: "destructive",
          bgColor: "bg-red-50",
          borderColor: "border-red-200",
          textColor: "text-red-800",
          iconColor: "text-red-600",
          titleColor: "text-red-700",
          Icon: XCircle
        };
      case "pending":
        return {
          variant: "default",
          bgColor: "bg-amber-50",
          borderColor: "border-amber-200",
          textColor: "text-amber-800",
          iconColor: "text-amber-600",
          titleColor: "text-amber-700",
          Icon: AlertTriangle
        };
      default:
        return {
          variant: "default",
          bgColor: "bg-green-50",
          borderColor: "border-green-200",
          textColor: "text-green-800",
          iconColor: "text-green-600",
          titleColor: "text-green-700",
          Icon: CheckCircle
        };
    }
  };
  
  const alertStyles = getAlertStyles();
  const { Icon } = alertStyles;
  
  // Titles for different states
  const getTitle = () => {
    switch (status) {
      case "loading":
        return t("Verifying Email");
      case "error":
        return t("Verification Failed");
      case "pending":
        return t("Email Verified - Approval Pending");
      default:
        return t("Email Verified Successfully");
    }
  };
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-blue-50 to-white p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-2xl font-bold text-primary">{t("Email Verification")}</CardTitle>
          <CardDescription>
            {t("Verification Result")}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="pb-6">
          <Alert 
            variant={alertStyles.variant === "destructive" ? "destructive" : "default"} 
            className={`${alertStyles.bgColor} ${alertStyles.borderColor} ${alertStyles.textColor}`}
          >
            <Icon className={`h-5 w-5 ${alertStyles.iconColor} ${status === 'loading' ? 'animate-spin' : ''}`} />
            <AlertTitle className={`text-xl font-semibold ${alertStyles.titleColor}`}>
              {getTitle()}
            </AlertTitle>
            <AlertDescription className={alertStyles.textColor}>
              {message}
            </AlertDescription>
          </Alert>
          
          {status === "pending" && (
            <div className="mt-4 text-center">
              <p className="text-muted-foreground text-sm">
                {t("Please wait for an administrator to review and approve your account. You will receive a notification once your account has been approved.")}
              </p>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-center pb-6">
          {status === "error" ? (
            <div className="space-y-3 w-full max-w-xs">
              <Button 
                onClick={handleReverify} 
                size="lg"
                className="w-full font-semibold"
                variant="default"
              >
                {t("Request New Verification Email")}
              </Button>
              <Button 
                onClick={handleGoToLogin} 
                size="lg"
                className="w-full font-semibold"
                variant="outline"
              >
                {t("Go to Login")}
              </Button>
            </div>
          ) : status === "loading" ? (
            <Button 
              disabled
              size="lg"
              className="w-full max-w-xs font-semibold opacity-50"
            >
              {t("Please wait...")}
            </Button>
          ) : (
            <Button 
              onClick={handleGoToLogin} 
              size="lg"
              className="w-full max-w-xs font-semibold"
            >
              {t("Go to Login")}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}