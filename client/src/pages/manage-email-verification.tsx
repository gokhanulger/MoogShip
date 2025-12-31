import React from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import Layout from "@/components/layout";
import VerificationDashboard from "@/components/admin/verification-dashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldAlertIcon, AlertCircleIcon } from "lucide-react";
import { useLocation } from "wouter";

export default function ManageEmailVerification() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  // Redirect non-admin users
  if (!user || user.role !== "admin") {
    setLocation("/");
    return null;
  }
  
  return (
    <Layout>
      <div className="container mx-auto py-6">
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("Email Verification Management")}</h1>
            <p className="text-muted-foreground mt-2">
              {t("Monitor and manage email verification for all users in the system")}
            </p>
          </div>
          
          <Alert>
            <ShieldAlertIcon className="h-4 w-4" />
            <AlertTitle>{t("Admin Only")}</AlertTitle>
            <AlertDescription>
              {t("This interface allows administrators to track and manage email verification statuses and resend verification emails as needed.")}
            </AlertDescription>
          </Alert>
          
          <Tabs defaultValue="verification-status" className="space-y-4">
            <TabsList>
              <TabsTrigger value="verification-status">{t("Verification Status")}</TabsTrigger>
              <TabsTrigger value="info">{t("Help & Information")}</TabsTrigger>
            </TabsList>
            
            <TabsContent value="verification-status" className="space-y-4">
              <VerificationDashboard />
            </TabsContent>
            
            <TabsContent value="info" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t("Email Verification Process")}</CardTitle>
                  <CardDescription>
                    {t("How the email verification system works")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <h3 className="text-lg font-semibold">{t("Verification Flow")}</h3>
                  <ol className="list-decimal pl-5 space-y-2">
                    <li>{t("When a new user registers, they receive an automatic verification email")}</li>
                    <li>{t("The user clicks the verification link in the email to verify their address")}</li>
                    <li>{t("Once verified, their account status is updated in the system")}</li>
                    <li>{t("Admin users can resend verification emails if needed")}</li>
                    <li>{t("Admin accounts are automatically verified during registration")}</li>
                  </ol>
                  
                  <div className="mt-6 p-4 border rounded-md bg-amber-50 flex items-start gap-3">
                    <AlertCircleIcon className="h-5 w-5 text-amber-500 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-amber-800">{t("Important Notes")}</h3>
                      <ul className="text-amber-800 mt-1 list-disc pl-5 space-y-1">
                        <li>{t("Verification emails expire after 24 hours")}</li>
                        <li>{t("Users cannot log in until they verify their email")}</li>
                        <li>{t("After verification, users still need admin approval (except admin accounts)")}</li>
                        <li>{t("All email activity is logged for audit purposes")}</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>{t("Troubleshooting")}</CardTitle>
                  <CardDescription>
                    {t("Common issues and solutions")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div className="border-b pb-2">
                      <h3 className="font-semibold">{t("User says they never received a verification email")}</h3>
                      <p className="text-muted-foreground mt-1">
                        {t("Use the 'Resend' button on the verification status tab to send a new verification email to the user.")}
                      </p>
                    </div>
                    
                    <div className="border-b pb-2">
                      <h3 className="font-semibold">{t("Verification link has expired")}</h3>
                      <p className="text-muted-foreground mt-1">
                        {t("Links expire after 24 hours. Use the 'Resend' button to generate a new verification email with a fresh link.")}
                      </p>
                    </div>
                    
                    <div className="border-b pb-2">
                      <h3 className="font-semibold">{t("User has verified but can't log in")}</h3>
                      <p className="text-muted-foreground mt-1">
                        {t("Check if the user's account has been approved in the user management section. After email verification, admin approval is still required.")}
                      </p>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold">{t("Email deliverability issues")}</h3>
                      <p className="text-muted-foreground mt-1">
                        {t("If multiple users are not receiving emails, check the SendGrid configuration and email deliverability settings. Ensure the sender email is properly verified.")}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}