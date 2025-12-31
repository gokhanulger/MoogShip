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
import PHOTO_2025_04_16_12_14_32 from "@assets/PHOTO-2025-04-16-12-14-32.jpg";
import WhatsApp_Image_2025_09_17_at_01_43_47 from "@assets/WhatsApp Image 2025-09-17 at 01.43.47.jpeg";
// We'll use a direct path to the image in the public folder instead of importing

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
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-8">{t('balance.title')}</h1>
        
        {/* Bank information card */}
        <div className="grid gap-8 grid-cols-1">
          

          
          
          

          {/* Bank Information Card for all users */}
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{t('balance.bankInformation')}</CardTitle>
              <CardDescription>{t('balance.bankInfoDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">                
                  {/* Bank Information Section */}
                  <div className="flex flex-col md:flex-row items-start gap-6">
                    {/* Current Balance Summary - Left Side */}
                    <div className="flex-shrink-0">
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200 w-80">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-lg font-semibold text-blue-900">
                            {i18n.language === 'tr' ? 'Mevcut Bakiye' : 'Current Balance'}
                          </h3>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setShowTurkishLira(!showTurkishLira)}
                                  className="flex items-center gap-2"
                                >
                                  {showTurkishLira ? (
                                    <>
                                      <span className="text-orange-600 font-medium">₺</span>
                                      <ToggleRight className="h-4 w-4 text-orange-600" />
                                    </>
                                  ) : (
                                    <>
                                      <span className="text-green-600 font-medium">$</span>
                                      <ToggleLeft className="h-4 w-4 text-green-600" />
                                    </>
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  {showTurkishLira 
                                    ? (i18n.language === 'tr' 
                                        ? 'USD görünümüne geç' 
                                        : 'Switch to USD view'
                                      )
                                    : (i18n.language === 'tr' 
                                        ? 'TL görünümüne geç' 
                                        : 'Switch to Turkish Lira view'
                                      )
                                  }
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Wallet className="h-5 w-5 text-blue-700" />
                            <span className="text-sm text-blue-700">
                              {i18n.language === 'tr' ? 'Borçlu olduğunuz tutar' : 'Amount you owe'}
                            </span>
                          </div>
                          <div className="text-2xl font-bold text-red-600">
                            {showTurkishLira && balanceData?.formattedBalanceInTry ? (
                              balanceData.formattedBalanceInTry
                            ) : (
                              balanceData?.formattedBalance || '$0.00'
                            )}
                          </div>
                          <div className="text-sm text-gray-600">
                            <span>{i18n.language === 'tr' ? 'Döviz kuru:' : 'Exchange rate:'} 1 USD = ₺{balanceData?.currencyRates?.usdToTryRate ? balanceData.currencyRates.usdToTryRate.toFixed(4) : '0'}</span>
                          </div>
                          <div className="text-xs text-gray-500">
                            {(() => {
                              if (!balanceData?.currencyRates?.lastUpdated) return '';
                              
                              try {
                                const timestamp = new Date(balanceData.currencyRates.lastUpdated);
                                
                                if (i18n.language === 'tr') {
                                  const formatted = timestamp.toLocaleDateString('tr-TR', {
                                    timeZone: 'Europe/Istanbul',
                                    day: '2-digit',
                                    month: 'long',
                                    year: 'numeric'
                                  }) + ', ' + timestamp.toLocaleTimeString('tr-TR', {
                                    timeZone: 'Europe/Istanbul',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: false
                                  });
                                  return `Güncellenme: ${formatted}`;
                                } else {
                                  const formatted = timestamp.toLocaleDateString('en-US', {
                                    timeZone: 'Europe/Istanbul',
                                    day: '2-digit',
                                    month: 'long',
                                    year: 'numeric'
                                  }) + ', ' + timestamp.toLocaleTimeString('en-US', {
                                    timeZone: 'Europe/Istanbul',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: false
                                  });
                                  return `Updated: ${formatted}`;
                                }
                              } catch (error) {
                                return i18n.language === 'tr' 
                                  ? `Güncellenme: ${balanceData.currencyRates.lastUpdated}`
                                  : `Updated: ${balanceData.currencyRates.lastUpdated}`;
                              }
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* QR Code Column - Center */}
                    <div className="flex-shrink-0">
                      <div className="w-80 h-80 border rounded-md overflow-hidden bg-white p-4 flex items-center justify-center">
                        {qrCodeDataUrl ? (
                          <img 
                            src={WhatsApp_Image_2025_09_17_at_01_43_47}
                            alt="Banking Information QR Code" 
                            className="w-full h-full object-contain contrast-125 brightness-110"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-500 rounded">
                            Generating QR Code...
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-center text-muted-foreground mt-2">
                        {i18n.language === 'tr' 
                          ? 'Bankacılık bilgileri için QR kod' 
                          : 'QR Code for banking info'
                        }
                      </p>
                    </div>
                    
                    {/* Bank Details Column */}
                    <div className="flex-grow space-y-4">
                      <div>
                        <h3 className="text-lg font-semibold mb-2">{t('balance.accountDetails')}</h3>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <p className="text-base font-medium bg-gray-50 p-2 rounded border flex-grow">
                              {COMPANY_NAME}
                            </p>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={copyCompanyNameToClipboard}
                              className="flex-shrink-0"
                            >
                              {companyNameCopied ? 'Copied!' : <Copy className="h-4 w-4" />}
                            </Button>
                          </div>
                          
                          {/* USD Account */}
                          <div>
                            <Label className="text-sm font-medium text-gray-700 mb-1 block">USD Account</Label>
                            <div className="flex items-center gap-2">
                              <p className="text-base font-mono bg-gray-50 p-2 rounded border flex-grow">
                                {USD_IBAN}
                              </p>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={copyUsdIbanToClipboard}
                                className="flex-shrink-0"
                              >
                                {usdIbanCopied ? 'Copied!' : <Copy className="h-4 w-4" />}
                              </Button>
                            </div>
                          </div>

                          {/* TL Account */}
                          <div>
                            <Label className="text-sm font-medium text-gray-700 mb-1 block">TL Account</Label>
                            <div className="flex items-center gap-2">
                              <p className="text-base font-mono bg-gray-50 p-2 rounded border flex-grow">
                                {TL_IBAN}
                              </p>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={copyTlIbanToClipboard}
                                className="flex-shrink-0"
                              >
                                {tlIbanCopied ? 'Copied!' : <Copy className="h-4 w-4" />}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                        <h4 className="text-sm font-semibold text-blue-700 mb-2">{t('balance.importantInformation')}</h4>
                        <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
                          <li>{t('balance.includeUsername')}</li>
                          <li>{t('balance.contactSupport')}</li>
                          <li>{t('balance.creditAfterVerification')}</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
        </div>

        {/* Transaction History */}
        <Card className="mt-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{t('financial.transactionHistory')}</CardTitle>
              <CardDescription>
                {t('financial.recentTransactions')}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportTransactions}
              disabled={isExporting}
              className="flex items-center gap-2 bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:text-green-800 disabled:opacity-50"
              data-testid="button-export-transactions"
            >
              <FileDown className={`h-7 w-7 ${isExporting ? 'animate-pulse' : ''}`} />
              {isExporting && <span className="text-xs">Exporting...</span>}
            </Button>
          </CardHeader>
          <CardContent>
            {/* Filtering and Sorting Controls */}
            <div className="mb-6 space-y-4">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('tables.search')}
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              {/* Filter and Sort Controls */}
              <div className="flex flex-wrap gap-2">
                {/* Transaction Type Filter */}
                <div className="flex flex-wrap gap-2 mr-4">
                  <Button 
                    variant={transactionFilter === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTransactionFilter("all")}
                    className="flex items-center gap-1"
                  >
                    <FilterX className="h-4 w-4" />
                    {t('common.all')}
                  </Button>
                  <Button 
                    variant={transactionFilter === "credit" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTransactionFilter("credit")}
                    className="flex items-center gap-1 text-green-700"
                  >
                    <Upload className="h-4 w-4" />
                    {t('financial.credits')}
                  </Button>
                  <Button 
                    variant={transactionFilter === "debit" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTransactionFilter("debit")}
                    className="flex items-center gap-1 text-destructive"
                  >
                    <Download className="h-4 w-4" />
                    {t('financial.debits')}
                  </Button>
                </div>
                
                {/* Sort Order Controls */}
                <div className="flex gap-2 ml-auto">
                  <Button 
                    variant={sortOrder === "newest" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSortOrder("newest")}
                    className="flex items-center gap-1"
                  >
                    <ArrowUpDown className="h-4 w-4" />
                    {t('financial.newestFirst')}
                  </Button>
                  <Button 
                    variant={sortOrder === "oldest" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSortOrder("oldest")}
                    className="flex items-center gap-1"
                  >
                    <ArrowUpDown className="h-4 w-4" />
                    {t('financial.oldestFirst')}
                  </Button>
                </div>
              </div>
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