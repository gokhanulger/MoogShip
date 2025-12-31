import { useState } from "react";
import { Button } from "./ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface ResendVerificationProps {
  email: string;
}

export function ResendVerification({ email }: ResendVerificationProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleResendVerification = async () => {
    if (!email || isLoading) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/resend-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Verification email sent",
          description: "Please check your inbox for the verification link",
          duration: 5000,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: data.message || "Failed to send verification email",
          duration: 5000,
        });
      }
    } catch (error) {
      console.error("Error resending verification email:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred. Please try again later.",
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleResendVerification}
      disabled={isLoading || !email}
      className="w-full mt-2"
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Sending...
        </>
      ) : (
        "Resend Verification Email"
      )}
    </Button>
  );
}