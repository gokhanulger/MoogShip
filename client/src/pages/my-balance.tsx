import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import Layout from "@/components/layout";
import QRCode from "qrcode";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { 
  ChevronRight, 
  Wallet, 
  Upload, 
  Download, 
  DollarSign, 
  FileDown, 
  Copy, 
  Search, 
  SlidersHorizontal,
  ArrowUpDown,
  FilterX,
  ToggleLeft,
  ToggleRight
} from "lucide-react";
import { formatTransactionForExport, exportToExcel } from "@/lib/export-utils";
import { formatDistanceToNow } from "date-fns";
// Bank QR images - using public folder path
const PHOTO_2025_04_16_12_14_32 = "/ziraat-bank-qr.png";
const WhatsApp_Image_2025_09_17_at_01_43_47 = "/ziraat-bank-qr-new.png";

interface Balance {
  balance: number;
  formattedBalance: string;
  balanceInTry: number | null;
  formattedBalanceInTry: string | null;
  minimumBalance: number | null;
  formattedMinimumBalance: string;
  formattedMinimumBalanceInTry: string | null;
  availableCredit: number | null;
  formattedAvailableCredit: string | null;
  formattedAvailableCreditInTry: string | null;
  currencyRates: {
    usdToTryRate: number;
    lastUpdated: string;
  } | null;
}

interface Transaction {
  id: number;
  userId: number;
  amount: number;
  formattedAmount: string;
  description: string;
  relatedShipmentId: number | null;
  createdAt: string;
  balanceAfter?: number;
  formattedBalance?: string;
}

export default function MyBalancePage() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null); 
  const [depositAmount, setDepositAmount] = useState<number | "">("");
  const [usdIbanCopied, setUsdIbanCopied] = useState(false);
  const [tlIbanCopied, setTlIbanCopied] = useState(false);
  const [companyNameCopied, setCompanyNameCopied] = useState(false);
  const [transactionFilter, setTransactionFilter] = useState<string>("all"); // "all", "credit", "debit"
  const [sortOrder, setSortOrder] = useState<string>("newest"); // "newest", "oldest"
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [showTurkishLira, setShowTurkishLira] = useState<boolean>(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);
  
  // Company name constant
  const COMPANY_NAME = "MOOGSHIP LOJİSTİK VE TİCARET LİMİTED ŞİRKETİ";
  const USD_IBAN = "TR62 0001 2009 8830 0053 0007 11";
  const TL_IBAN = "TR24 0001 2009 8830 0010 2617 40";
  
  // Function to handle company name copy to clipboard
  const copyCompanyNameToClipboard = () => {
    navigator.clipboard.writeText(COMPANY_NAME).then(() => {
      setCompanyNameCopied(true);
      toast({
        title: "Company Name Copied",
        description: "Company name has been copied to clipboard."
      });
      
      // Reset copy status after 2 seconds
      setTimeout(() => {
        setCompanyNameCopied(false);
      }, 2000);
    }).catch(err => {
      console.error("Failed to copy company name:", err);
      toast({
        title: "Copy failed",
        description: "Could not copy company name to clipboard.",
        variant: "destructive"
      });
    });
  };
  
  // Generate QR code for banking information
  useEffect(() => {
    const generateQRCode = async () => {
      try {
        const bankingInfo = `Company: ${COMPANY_NAME}\nUSD IBAN: ${USD_IBAN}\nTL IBAN: ${TL_IBAN}`;
        const dataUrl = await QRCode.toDataURL(bankingInfo, {
          width: 256,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        setQrCodeDataUrl(dataUrl);
      } catch (error) {
        console.error('Error generating QR code:', error);
      }
    };

    generateQRCode();
  }, []);

  // Function to handle USD IBAN copy to clipboard
  const copyUsdIbanToClipboard = () => {
    navigator.clipboard.writeText(USD_IBAN).then(() => {
      setUsdIbanCopied(true);
      toast({
        title: "USD IBAN Copied",
        description: "USD bank account number has been copied to clipboard."
      });
      
      // Reset copy status after 2 seconds
      setTimeout(() => {
        setUsdIbanCopied(false);
      }, 2000);
    }).catch(err => {
      console.error("Failed to copy USD IBAN:", err);
      toast({
        title: "Copy failed",
        description: "Could not copy USD IBAN to clipboard.",
        variant: "destructive"
      });
    });
  };

  // Function to handle TL IBAN copy to clipboard
  const copyTlIbanToClipboard = () => {
    navigator.clipboard.writeText(TL_IBAN).then(() => {
      setTlIbanCopied(true);
      toast({
        title: "TL IBAN Copied",
        description: "TL bank account number has been copied to clipboard."
      });
      
      // Reset copy status after 2 seconds
      setTimeout(() => {
        setTlIbanCopied(false);
      }, 2000);
    }).catch(err => {
      console.error("Failed to copy TL IBAN:", err);
      toast({
        title: "Copy failed",
        description: "Could not copy TL IBAN to clipboard.",
        variant: "destructive"
      });
    });
  };
  
  // Function to handle transaction export
  const handleExportTransactions = async () => {
    if (isExporting) return; // Prevent multiple simultaneous exports
    
    setIsExporting(true);
    try {
      // Fetch ALL transactions for export (no limit)
      const res = await apiRequest("GET", "/api/transactions-with-balance?export=true");
      if (!res.ok) {
        throw new Error("Failed to fetch all transactions for export");
      }
      
      const allTransactions = await res.json();
      
      if (allTransactions.length === 0) {
        toast({
          title: "No transactions to export",
          description: "You don't have any transactions to export.",
          variant: "destructive"
        });
        return;
      }
      
      // Format all transactions for export
      const exportData = allTransactions.map((transaction: any) => 
        formatTransactionForExport({
          ...transaction,
          formattedAmount: `${transaction.amount >= 0 ? '' : '-'}$${Math.abs(transaction.amount / 100).toFixed(2)}`
        })
      );
      
      // Export to Excel
      exportToExcel(exportData, 'Transaction_History');
      
      toast({
        title: "Export successful",
        description: `${allTransactions.length} transactions exported to Excel.`
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export failed",
        description: "Failed to export transaction history.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Fetch current user
  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch('/api/user', {
          credentials: 'include'
        });
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    }
    fetchUser();
  }, []);

  // Check if user is admin
  const isAdmin = user?.role === "admin";

  // Fetch user balance
  const { 
    data: balanceData,
    isLoading: isBalanceLoading,
    isError: isBalanceError,
    refetch: refetchBalance
  } = useQuery({
    queryKey: ["/api/balance"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/balance");
      if (!res.ok) {
        throw new Error("Failed to fetch balance");
      }
      const data = await res.json();
      
      // Return the complete data from the API including Turkish Lira fields
      return {
        balance: data.balance,
        formattedBalance: data.formattedBalance,
        balanceInTry: data.balanceInTry,
        formattedBalanceInTry: data.formattedBalanceInTry,
        minimumBalance: data.minimumBalance,
        formattedMinimumBalance: data.formattedMinimumBalance,
        formattedMinimumBalanceInTry: data.formattedMinimumBalanceInTry,
        availableCredit: data.availableCredit,
        formattedAvailableCredit: data.formattedAvailableCredit,
        formattedAvailableCreditInTry: data.formattedAvailableCreditInTry,
        currencyRates: data.currencyRates
      };
    },
    // Always enabled since we're using session authentication
    // Refresh balance data every 5 seconds
    refetchInterval: 5000
  });
  
  // Fetch transaction history with balance calculations
  const {
    data: transactions,
    isLoading: isTransactionsLoading,
    isError: isTransactionsError
  } = useQuery({
    queryKey: ["/api/transactions-with-balance"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/transactions-with-balance");
      if (!res.ok) {
        throw new Error("Failed to fetch transactions");
      }
      const data = await res.json();
      // Format transactions for display
      return data.map((transaction: any) => ({
        ...transaction,
        formattedAmount: `${transaction.amount >= 0 ? '' : '-'}$${Math.abs(transaction.amount / 100).toFixed(2)}`
      }));
    },
    // Always fetch transactions
    refetchInterval: 5000
  });

  // Deposit funds mutation
  const depositMutation = useMutation({
    mutationFn: async (amount: number) => {
      const res = await apiRequest("POST", "/api/balance/deposit", { 
        amount, 
        description: "Manual deposit" 
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Deposit successful",
        description: "Your balance has been updated.",
      });
      // Invalidate both balance-related queries and user data
      queryClient.invalidateQueries({ queryKey: ["/api/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions-with-balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setDepositAmount("");
    },
    onError: (error: Error) => {
      toast({
        title: "Deposit failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleDeposit = () => {
    if (!depositAmount || typeof depositAmount !== 'number' || depositAmount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount to deposit.",
        variant: "destructive",
      });
      return;
    }
    
    // Pass the dollar amount directly - the server will convert to cents
    // This avoids double conversion (client and server both converting)
    depositMutation.mutate(depositAmount);
  };
  
  // Filter and sort transactions
  const filteredAndSortedTransactions = React.useMemo(() => {
    if (!transactions) return [];
    
    // First apply the type filter
    let filtered = [...transactions];
    if (transactionFilter === "credit") {
      filtered = filtered.filter(t => t.amount >= 0);
    } else if (transactionFilter === "debit") {
      filtered = filtered.filter(t => t.amount < 0);
    }
    
    // Then apply the search filter (case insensitive)
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(term) ||
        t.formattedAmount.toLowerCase().includes(term) ||
        new Date(t.createdAt).toLocaleDateString().toLowerCase().includes(term)
      );
    }
    
    // Finally sort
    return filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });
  }, [transactions, transactionFilter, sortOrder, searchTerm]);

  return (
    <Layout>
      <div className="container mx-auto py-4">
        {/* Compact Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">{t('balance.title')}</h1>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTurkishLira(!showTurkishLira)}
                    className="h-8 px-2"
                  >
                    {showTurkishLira ? (
                      <span className="text-orange-600 font-medium">₺ TL</span>
                    ) : (
                      <span className="text-green-600 font-medium">$ USD</span>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{showTurkishLira ? 'USD görünümüne geç' : 'TL görünümüne geç'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Compact Balance & Bank Info */}
        <div className="bg-white rounded-lg border shadow-sm p-4 mb-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Balance Section */}
            <div className="flex items-center gap-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <Wallet className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-xs text-gray-500">{i18n.language === 'tr' ? 'Borçlu olduğunuz tutar' : 'Amount you owe'}</p>
                <p className={`text-xl font-bold ${
                  balanceData && balanceData.balance > 0 ? 'text-green-600' :
                  balanceData && balanceData.balance < 0 ? 'text-red-600' : 'text-gray-900'
                }`}>
                  {showTurkishLira && balanceData?.formattedBalanceInTry
                    ? balanceData.formattedBalanceInTry
                    : balanceData?.formattedBalance || '$0.00'}
                </p>
                <p className="text-xs text-gray-400">
                  1 USD = ₺{balanceData?.currencyRates?.usdToTryRate?.toFixed(2) || '0'}
                </p>
              </div>
            </div>

            {/* QR Code - Small */}
            <div className="flex items-center gap-3">
              <div className="w-20 h-20 border rounded overflow-hidden bg-white flex-shrink-0">
                <img
                  src={WhatsApp_Image_2025_09_17_at_01_43_47}
                  alt="QR Code"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="text-xs text-gray-500">
                <p className="font-medium text-gray-700 mb-1">{t('balance.accountDetails')}</p>
                <p className="truncate max-w-[200px]">{COMPANY_NAME}</p>
              </div>
            </div>

            {/* Bank Accounts - Compact */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* USD */}
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded border">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500">USD IBAN</p>
                  <p className="text-xs font-mono truncate">{USD_IBAN}</p>
                </div>
                <Button variant="ghost" size="sm" className="h-7 px-2" onClick={copyUsdIbanToClipboard}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              {/* TL */}
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded border">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500">TL IBAN</p>
                  <p className="text-xs font-mono truncate">{TL_IBAN}</p>
                </div>
                <Button variant="ghost" size="sm" className="h-7 px-2" onClick={copyTlIbanToClipboard}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>

          {/* Important Info - Collapsible or inline */}
          <div className="mt-3 pt-3 border-t text-xs text-blue-700 flex flex-wrap gap-x-4 gap-y-1">
            <span>• {t('balance.includeUsername')}</span>
            <span>• {t('balance.contactSupport')}</span>
          </div>
        </div>

        {/* Transaction History - Compact */}
        <Card>
          <CardHeader className="py-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base">{t('financial.transactionHistory')}</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExportTransactions}
              disabled={isExporting}
              className="h-8 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
            >
              <FileDown className={`h-4 w-4 ${isExporting ? 'animate-pulse' : ''}`} />
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            {/* Compact Filters */}
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
                <Input
                  placeholder={t('tables.search')}
                  className="h-8 pl-7 text-xs"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex gap-1">
                <Button
                  variant={transactionFilter === "all" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setTransactionFilter("all")}
                  className="h-8 px-2 text-xs"
                >
                  {t('common.all')}
                </Button>
                <Button
                  variant={transactionFilter === "credit" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setTransactionFilter("credit")}
                  className="h-8 px-2 text-xs text-green-600"
                >
                  <Upload className="h-3 w-3 mr-1" />
                  {t('financial.credits')}
                </Button>
                <Button
                  variant={transactionFilter === "debit" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setTransactionFilter("debit")}
                  className="h-8 px-2 text-xs text-red-600"
                >
                  <Download className="h-3 w-3 mr-1" />
                  {t('financial.debits')}
                </Button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSortOrder(sortOrder === "newest" ? "oldest" : "newest")}
                className="h-8 px-2 text-xs ml-auto"
              >
                <ArrowUpDown className="h-3 w-3 mr-1" />
                {sortOrder === "newest" ? t('financial.newestFirst') : t('financial.oldestFirst')}
              </Button>
            </div>
            
            {isTransactionsLoading ? (
              <div className="h-24 flex items-center justify-center">
                {t('common.loading')}
              </div>
            ) : isTransactionsError ? (
              <div className="h-24 flex items-center justify-center text-destructive">
                {t('financial.transactionFailed')}
              </div>
            ) : !transactions?.length ? (
              <div className="h-24 flex items-center justify-center text-muted-foreground">
                {t('financial.noTransactions')}
              </div>
            ) : filteredAndSortedTransactions.length === 0 ? (
              <div className="h-24 flex items-center justify-center text-muted-foreground">
                {t('tables.noResults')}
              </div>
            ) : (
              <Table>
                <TableCaption>{t('financial.recentTransactions')}</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('tables.date')}</TableHead>
                    <TableHead>{t('tables.description')}</TableHead>
                    <TableHead className="text-left">{t('financial.credit')}</TableHead>
                    <TableHead className="text-right">{t('financial.debit')}</TableHead>
                    <TableHead className="text-right">{t('financial.balance')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedTransactions.map((transaction: Transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-medium">
                        {new Date(transaction.createdAt).toLocaleDateString()}
                        <div className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(transaction.createdAt), { addSuffix: true })}
                        </div>
                      </TableCell>
                      <TableCell>{transaction.description}</TableCell>
                      {/* Credit column (left side) */}
                      <TableCell className="text-left">
                        {transaction.amount >= 0 && (
                          <span className="text-green-600 flex items-center">
                            <Upload className="mr-1 h-3 w-3" />
                            {transaction.formattedAmount}
                          </span>
                        )}
                      </TableCell>
                      {/* Debit column (right side) */}
                      <TableCell className="text-right">
                        {transaction.amount < 0 && (
                          <span className="text-destructive flex items-center justify-end">
                            {transaction.formattedAmount.replace('-', '')}
                            <Download className="ml-1 h-3 w-3" />
                          </span>
                        )}
                      </TableCell>
                      {/* Balance column */}
                      <TableCell className="text-right font-medium">
                        {transaction.balanceAfter !== undefined ? 
                          `$${(transaction.balanceAfter / 100).toFixed(2)}` : 
                          'N/A'
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}