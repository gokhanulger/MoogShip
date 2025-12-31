import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Layout from "@/components/layout";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeftIcon,
  RefreshCw,
  Loader2
} from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import TransactionTable from "@/components/transaction-table";
import { TransactionType } from "@shared/schema";
import { withAuth } from "@/lib/with-auth";

function TransactionList() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"all" | "deposits" | "purchases" | "refunds">("all");
  
  // Fetch transactions with balance
  const { data: transactions, isLoading, isError, refetch } = useQuery({
    queryKey: ["/api/transactions-with-balance"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/transactions-with-balance");
      if (!res.ok) {
        throw new Error("Failed to fetch transactions");
      }
      return res.json();
    },
    // Refresh every 10 seconds
    refetchInterval: 10000
  });
  
  // Filter transactions based on active tab
  const filteredTransactions = (() => {
    if (!transactions) return [];
    
    switch (activeTab) {
      case "deposits":
        return transactions.filter((t: any) => t.type === TransactionType.DEPOSIT);
      case "purchases":
        return transactions.filter((t: any) => t.type === TransactionType.PURCHASE);
      case "refunds":
        return transactions.filter((t: any) => t.type === TransactionType.REFUND);
      default:
        return transactions;
    }
  })();
  
  const handleRefresh = () => {
    refetch();
    toast({
      title: "Refreshed",
      description: "Transaction list has been refreshed"
    });
  };
  
  return (
    <Layout>
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <h1 className="text-3xl font-bold">Transaction History</h1>
          </div>
          <div className="flex items-center">
            <Button 
              variant="outline" 
              size="sm" 
              className="mr-4"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="ml-2">Refresh</span>
            </Button>
          </div>
        </div>
        
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>My Transactions</CardTitle>
            <CardDescription>View your complete transaction history.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs
              defaultValue="all"
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as "all" | "deposits" | "purchases" | "refunds")}
              className="w-full mb-6"
            >
              <TabsList className="grid w-full md:w-[600px] grid-cols-4">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="deposits">Deposits</TabsTrigger>
                <TabsTrigger value="purchases">Purchases</TabsTrigger>
                <TabsTrigger value="refunds">Refunds</TabsTrigger>
              </TabsList>
            </Tabs>
            
            <TransactionTable
              transactions={filteredTransactions}
              isLoading={isLoading}
              showPagination={true}
            />
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

export default withAuth(TransactionList);