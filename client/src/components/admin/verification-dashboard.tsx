import React from "react";
import { useVerificationManager } from "@/hooks/use-verification-manager";
import { RefreshCw, CheckCircleIcon, AlertCircleIcon, MailIcon, UserIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import EmailVerificationManager from "./email-verification-manager";

export default function VerificationDashboard() {
  const { t } = useTranslation();
  const { stats, isLoading, refetch } = useVerificationManager();
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{t("Verification Dashboard")}</h1>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          {t("Refresh")}
        </Button>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Users Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("Total Users")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <UserIcon className="h-5 w-5 mr-2 text-blue-500" />
              <div className="text-2xl font-bold">
                {isLoading ? <RefreshCw className="h-5 w-5 animate-spin" /> : stats.total}
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Verified Users Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("Verified")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <CheckCircleIcon className="h-5 w-5 mr-2 text-green-500" />
              <div className="text-2xl font-bold">
                {isLoading ? <RefreshCw className="h-5 w-5 animate-spin" /> : stats.verified}
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Unverified Users Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("Awaiting Verification")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <MailIcon className="h-5 w-5 mr-2 text-orange-500" />
              <div className="text-2xl font-bold">
                {isLoading ? <RefreshCw className="h-5 w-5 animate-spin" /> : stats.unverified}
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Pending Approval Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("Pending Approval")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <AlertCircleIcon className="h-5 w-5 mr-2 text-amber-500" />
              <div className="text-2xl font-bold">
                {isLoading ? <RefreshCw className="h-5 w-5 animate-spin" /> : stats.pendingApproval}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Verification Status Table */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{t("Email Verification Status")}</CardTitle>
          <CardDescription>{t("Manage email verification for all users")}</CardDescription>
        </CardHeader>
        <CardContent>
          <EmailVerificationManager />
        </CardContent>
        <CardFooter className="border-t p-4 text-sm text-muted-foreground">
          {t("Tip: You can resend verification emails to users who haven't verified their email address yet.")}
        </CardFooter>
      </Card>
    </div>
  );
}