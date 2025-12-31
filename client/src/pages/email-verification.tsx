import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";
// This is a standalone component that doesn't use any authentication context
// It's meant to be accessible without being logged in

export default function EmailVerification() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState<string>("");

  // Extract token from URL
  const token = window.location.pathname.split("/").pop();
  
  // Function to navigate without using hooks
  const goToLogin = () => {
    window.location.href = "/auth";
  };

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        // Determine the API URL based on the current environment
        // This ensures the verification works from any domain (including app.moogship.com)
        let apiUrl;
        
        // Always use the relative API path
        // This works for both localhost and Replit workspace
        apiUrl = `/api/verify-email/${token}`;
        
        console.log(`Using verification API URL: ${apiUrl}`);
        
        // Call the verification API endpoint
        const response = await fetch(apiUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          // Allow credentials to be sent across domains
          credentials: 'include'
        });

        const data = await response.json();

        if (response.ok) {
          setStatus("success");
          setMessage(data.message);
        } else {
          setStatus("error");
          setMessage(data.message || "Verification failed. Please try again or contact support.");
        }
      } catch (error) {
        setStatus("error");
        setMessage("An error occurred during verification. Please try again or contact support.");
        console.error("Verification error:", error);
      }
    };

    if (token) {
      verifyEmail();
    } else {
      setStatus("error");
      setMessage("Invalid verification link. Please check your email and try again.");
    }
  }, [token]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle className="text-center">Email Verification</CardTitle>
          <CardDescription className="text-center">
            Verifying your email address
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status === "loading" && (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
              <p className="text-center text-muted-foreground">
                Please wait while we verify your email address...
              </p>
            </div>
          )}

          {status === "success" && (
            <Alert variant="default" className="bg-green-50 border-green-200 text-green-800">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <AlertTitle>Success!</AlertTitle>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          {status === "error" && (
            <Alert variant="destructive">
              <AlertCircle className="h-5 w-5" />
              <AlertTitle>Verification Failed</AlertTitle>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          {status === "loading" ? (
            <Button disabled variant="outline">
              Please wait...
            </Button>
          ) : (
            <Button onClick={goToLogin}>Return to Login</Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}