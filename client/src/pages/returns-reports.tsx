import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import Layout from "@/components/layout";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { 
  Download, 
  TrendingUp, 
  TrendingDown,
  Package,
  DollarSign,
  Calendar,
  Users
} from "lucide-react";
import { type Return } from "@shared/schema";

const statusOptions = [
  { value: "received", label: "Teslim Alındı", color: "#3b82f6" },
  { value: "inspected", label: "İncelendi", color: "#f59e0b" },
  { value: "refund_initiated", label: "İade Başlatıldı", color: "#f97316" },
  { value: "completed", label: "Tamamlandı", color: "#10b981" },
];

export default function ReturnsReports() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedSeller, setSelectedSeller] = useState<string>("all");

  // Fetch returns data
  const { data: returns, isLoading: returnsLoading } = useQuery({
    queryKey: ["/api/returns"],
    retry: false,
  });

  // Fetch sellers for filtering
  const { data: sellers } = useQuery({
    queryKey: ["/api/users"],
    retry: false,
  });

  // Fetch report data
  const { data: reportData, isLoading: reportLoading } = useQuery({
    queryKey: ["/api/returns/report", selectedYear, selectedMonth, selectedSeller],
    queryFn: async () => {
      const params = new URLSearchParams({
        year: selectedYear.toString(),
        month: selectedMonth.toString(),
      });
      if (selectedSeller !== "all") {
        params.append("sellerId", selectedSeller);
      }
      const response = await fetch(`/api/returns/report?${params}`);
      return response.json();
    },
    retry: false,
  });

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "₺0,00";
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount / 100);
  };

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return format(new Date(date), "dd MMM yyyy", { locale: tr });
  };

  const getSellerName = (sellerId: number) => {
    const seller = sellers?.data?.find((s: any) => s.id === sellerId);
    return seller ? seller.name : `Satıcı #${sellerId}`;
  };

  // Calculate statistics
  const filteredReturns = returns?.data?.filter((returnItem: Return) => {
    const returnDate = new Date(returnItem.returnDate || '');
    const returnMonth = returnDate.getMonth() + 1;
    const returnYear = returnDate.getFullYear();
    
    if (returnMonth !== selectedMonth || returnYear !== selectedYear) return false;
    if (selectedSeller !== "all" && returnItem.sellerId.toString() !== selectedSeller) return false;
    
    return true;
  }) || [];

  const totalReturns = filteredReturns.length;
  const totalValue = filteredReturns.reduce((sum: number, r: Return) => sum + (r.returnValue || 0), 0);
  const averageValue = totalReturns > 0 ? totalValue / totalReturns : 0;
  
  const completedReturns = filteredReturns.filter((r: Return) => r.status === 'completed').length;
  const completionRate = totalReturns > 0 ? (completedReturns / totalReturns) * 100 : 0;

  // Status distribution
  const statusDistribution = statusOptions.map(status => ({
    name: status.label,
    value: filteredReturns.filter((r: Return) => r.status === status.value).length,
    color: status.color
  }));

  // Monthly trend data (last 6 months)
  const monthlyTrend = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    
    const monthReturns = returns?.data?.filter((r: Return) => {
      const returnDate = new Date(r.returnDate || '');
      return returnDate.getMonth() + 1 === month && returnDate.getFullYear() === year;
    }) || [];
    
    monthlyTrend.push({
      month: format(date, "MMM", { locale: tr }),
      returns: monthReturns.length,
      value: monthReturns.reduce((sum: number, r: Return) => sum + (r.returnValue || 0), 0) / 100
    });
  }

  // Top reasons for returns
  const returnReasons = filteredReturns.reduce((acc: any, r: Return) => {
    const reason = r.returnReason || 'Belirtilmemiş';
    acc[reason] = (acc[reason] || 0) + 1;
    return acc;
  }, {});

  const topReasons = Object.entries(returnReasons)
    .map(([reason, count]) => ({ reason, count }))
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, 5);

  const handleExportToCSV = () => {
    const csvData = filteredReturns.map((returnItem: Return) => ({
      'Sipariş No': returnItem.orderNumber,
      'Satıcı': getSellerName(returnItem.sellerId),
      'Ürün': returnItem.productName,
      'Müşteri': returnItem.customerName,
      'Email': returnItem.customerEmail || '',
      'İade Nedeni': returnItem.returnReason,
      'Durum': statusOptions.find(s => s.value === returnItem.status)?.label || returnItem.status,
      'İade Değeri': formatCurrency(returnItem.returnValue),
      'İade Tarihi': formatDate(returnItem.returnDate),
      'İnceleme Tarihi': formatDate(returnItem.inspectionDate),
      'Tamamlanma Tarihi': formatDate(returnItem.completedDate),
      'Notlar': returnItem.notes || ''
    }));

    const csv = [
      Object.keys(csvData[0] || {}).join(','),
      ...csvData.map(row => Object.values(row).map(value => `"${value}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `iade-raporu-${selectedYear}-${selectedMonth.toString().padStart(2, '0')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">İade Raporları</h1>
          <p className="text-muted-foreground">İade verilerini analiz edin ve raporlar oluşturun</p>
        </div>
        
        <Button onClick={handleExportToCSV} disabled={filteredReturns.length === 0}>
          <Download className="w-4 h-4 mr-2" />
          CSV İndir
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtreler</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Yıl</Label>
              <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026].map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Ay</Label>
              <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                    <SelectItem key={month} value={month.toString()}>
                      {format(new Date(2024, month - 1), "MMMM", { locale: tr })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Satıcı</Label>
              <Select value={selectedSeller} onValueChange={setSelectedSeller}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Satıcılar</SelectItem>
                  {sellers?.data?.map((seller: any) => (
                    <SelectItem key={seller.id} value={seller.id.toString()}>
                      {seller.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam İade</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalReturns}</div>
            <p className="text-xs text-muted-foreground">
              Seçilen dönem için
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Değer</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
            <p className="text-xs text-muted-foreground">
              İade edilen toplam tutar
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ortalama Değer</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(averageValue)}</div>
            <p className="text-xs text-muted-foreground">
              İade başına ortalama
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tamamlanma Oranı</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">%{completionRate.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              Tamamlanan iadeler
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Durum Dağılımı</CardTitle>
            <CardDescription>İadelerin duruma göre dağılımı</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Aylık Trend</CardTitle>
            <CardDescription>Son 6 ayın iade trendleri</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value, name) => [
                  name === 'returns' ? value : formatCurrency(value * 100),
                  name === 'returns' ? 'İade Sayısı' : 'Toplam Değer'
                ]} />
                <Line type="monotone" dataKey="returns" stroke="#3b82f6" strokeWidth={2} />
                <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Return Reasons */}
      <Card>
        <CardHeader>
          <CardTitle>En Sık İade Nedenleri</CardTitle>
          <CardDescription>Seçilen dönem için en çok görülen iade nedenleri</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topReasons}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="reason" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detailed Returns Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detaylı İade Listesi</CardTitle>
          <CardDescription>
            {selectedSeller !== "all" && getSellerName(parseInt(selectedSeller)) + " için "}
            {format(new Date(selectedYear, selectedMonth - 1), "MMMM yyyy", { locale: tr })} dönemi iade kayıtları
          </CardDescription>
        </CardHeader>
        <CardContent>
          {returnsLoading ? (
            <div className="text-center py-8">Yükleniyor...</div>
          ) : filteredReturns.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Seçilen kriterlere uygun iade kaydı bulunamadı
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sipariş No</TableHead>
                  <TableHead>Satıcı</TableHead>
                  <TableHead>Ürün</TableHead>
                  <TableHead>Müşteri</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>İade Değeri</TableHead>
                  <TableHead>İade Tarihi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReturns.map((returnItem: Return) => (
                  <TableRow key={returnItem.id}>
                    <TableCell className="font-mono">{returnItem.orderNumber}</TableCell>
                    <TableCell>{getSellerName(returnItem.sellerId)}</TableCell>
                    <TableCell>{returnItem.productName}</TableCell>
                    <TableCell>{returnItem.customerName}</TableCell>
                    <TableCell>
                      <Badge className={statusOptions.find(s => s.value === returnItem.status)?.color}>
                        {statusOptions.find(s => s.value === returnItem.status)?.label}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(returnItem.returnValue)}</TableCell>
                    <TableCell>{formatDate(returnItem.returnDate)}</TableCell>
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