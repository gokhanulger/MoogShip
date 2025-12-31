import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import {
  BarChart2,
  Calendar,
  DollarSign,
  Loader2,
  Package,
  ShoppingCart,
  TrendingUp,
  Truck,
  Users,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Button } from "@/components/ui/button";
import Layout from "@/components/layout";
import { useToast } from "@/hooks/use-toast";

// Sample data for charts and tables
// In a real application, this would come from API calls
const sampleCustomerShipmentData = [
  { name: "Customer A", value: 45, revenue: 4500 },
  { name: "Customer B", value: 32, revenue: 3200 },
  { name: "Customer C", value: 28, revenue: 2800 },
  { name: "Customer D", value: 24, revenue: 2400 },
  { name: "Customer E", value: 18, revenue: 1800 },
  { name: "Customer F", value: 15, revenue: 1500 },
  { name: "Customer G", value: 10, revenue: 1000 },
];

const sampleMonthlyData = [
  { name: "Jan", shipments: 65, revenue: 6500 },
  { name: "Feb", shipments: 59, revenue: 5900 },
  { name: "Mar", shipments: 80, revenue: 8000 },
  { name: "Apr", shipments: 81, revenue: 8100 },
  { name: "May", shipments: 56, revenue: 5600 },
  { name: "Jun", shipments: 55, revenue: 5500 },
  { name: "Jul", shipments: 40, revenue: 4000 },
  { name: "Aug", shipments: 45, revenue: 4500 },
  { name: "Sep", shipments: 60, revenue: 6000 },
  { name: "Oct", shipments: 70, revenue: 7000 },
  { name: "Nov", shipments: 75, revenue: 7500 },
  { name: "Dec", shipments: 90, revenue: 9000 },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

const sampleShipmentStatusData = [
  { name: "Pending", value: 35 },
  { name: "In Transit", value: 45 },
  { name: "Delivered", value: 60 },
  { name: "Returned", value: 10 },
  { name: "Cancelled", value: 5 },
];

const sampleCountryDistributionData = [
  { name: "Turkey", value: 45 },
  { name: "United States", value: 28 },
  { name: "Germany", value: 20 },
  { name: "United Kingdom", value: 15 },
  { name: "Russia", value: 12 },
  { name: "France", value: 10 },
  { name: "Other", value: 20 },
];

const sampleTopCustomersData = [
  { 
    id: 1, 
    name: "John Smith", 
    email: "john@example.com", 
    shipments: 45, 
    revenue: 4500, 
    avgOrderValue: 100 
  },
  { 
    id: 2, 
    name: "Sarah Johnson", 
    email: "sarah@example.com", 
    shipments: 32, 
    revenue: 3200, 
    avgOrderValue: 100 
  },
  { 
    id: 3, 
    name: "Mike Brown", 
    email: "mike@example.com", 
    shipments: 28, 
    revenue: 2800, 
    avgOrderValue: 100 
  },
  { 
    id: 4, 
    name: "Emma Wilson", 
    email: "emma@example.com", 
    shipments: 24, 
    revenue: 2400, 
    avgOrderValue: 100 
  },
  { 
    id: 5, 
    name: "David Lee", 
    email: "david@example.com", 
    shipments: 18, 
    revenue: 1800, 
    avgOrderValue: 100 
  },
];

export default function Reports() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [timeRange, setTimeRange] = useState("yearly");
  const [reportType, setReportType] = useState("overview");

  // Fetch overall shipment stats
  const { data: shipmentsData, isLoading: shipmentsLoading } = useQuery<{
    totalShipments: number;
    recentShipments: number;
    totalRevenue: number;
    averageOrderValue: number;
    activeCustomers: number;
  }>({
    queryKey: ["/api/analytics/shipments"],
  });

  // Fetch customer shipment analytics
  const { data: customerShipmentData, isLoading: customerDataLoading } = useQuery<{
    id: number;
    name: string;
    username: string;
    email: string;
    shipments: number;
    revenue: number;
    avgOrderValue: number;
  }[]>({
    queryKey: ["/api/analytics/customer-shipments"],
  });

  // Fetch revenue data
  const { data: revenueData, isLoading: revenueLoading } = useQuery<{
    name: string;
    shipments: number;
    revenue: number;
  }[]>({
    queryKey: ["/api/analytics/revenue"],
  });

  // Fetch shipment status data
  const { data: shipmentStatusData, isLoading: statusLoading } = useQuery<{
    name: string;
    value: number;
  }[]>({
    queryKey: ["/api/analytics/shipment-status"],
  });

  const downloadReport = () => {
    toast({
      title: "Report downloading",
      description: "Your report is being generated and will download shortly.",
    });
    // In a real implementation, this would trigger an API call to generate and download the report
  };

  return (
    <Layout>
      <div className="flex flex-col gap-6 p-4 md:p-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">{t("Reports & Analytics")}</h1>
          <p className="text-muted-foreground">
            {t("View analytics and generate reports for your shipping operations.")}
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <Tabs defaultValue={reportType} onValueChange={setReportType} className="w-full md:w-auto">
            <TabsList>
              <TabsTrigger value="overview">
                <BarChart2 className="h-4 w-4 mr-2" />
                {t("Overview")}
              </TabsTrigger>
              <TabsTrigger value="customers">
                <Users className="h-4 w-4 mr-2" />
                {t("Customers")}
              </TabsTrigger>
              <TabsTrigger value="shipments">
                <Truck className="h-4 w-4 mr-2" />
                {t("Shipments")}
              </TabsTrigger>
              <TabsTrigger value="revenue">
                <DollarSign className="h-4 w-4 mr-2" />
                {t("Revenue")}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-4">
            <Select
              value={timeRange}
              onValueChange={setTimeRange}
            >
              <SelectTrigger className="w-[180px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue placeholder={t("Select time range")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">{t("This Month")}</SelectItem>
                <SelectItem value="quarterly">{t("Last Quarter")}</SelectItem>
                <SelectItem value="yearly">{t("This Year")}</SelectItem>
                <SelectItem value="custom">{t("Custom Range")}</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={downloadReport}>
              {t("Download Report")}
            </Button>
          </div>
        </div>

        {/* Overview Dashboard */}
        {reportType === "overview" && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t("Total Shipments")}
                </CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {shipmentsLoading ? "..." : (shipmentsData?.totalShipments || 0).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  {!shipmentsLoading && shipmentsData?.recentShipments ? 
                    `${shipmentsData.recentShipments} ${t("from last month")}` : 
                    t("from last month")}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t("Total Revenue")}
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${shipmentsLoading ? "..." : (shipmentsData?.totalRevenue || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </div>
                <p className="text-xs text-muted-foreground">
                  +15.2% {t("from last month")}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t("Active Customers")}
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {shipmentsLoading ? "..." : (shipmentsData?.activeCustomers || 0).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  +7.2% {t("from last month")}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t("Avg Order Value")}
                </CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${shipmentsLoading ? "..." : (shipmentsData?.averageOrderValue || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </div>
                <p className="text-xs text-muted-foreground">
                  +2.5% {t("from last month")}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Monthly Trends Chart */}
        {reportType === "overview" && (
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>{t("Monthly Trends")}</CardTitle>
            </CardHeader>
            <CardContent>
              {revenueLoading ? (
                <div className="flex items-center justify-center h-[350px]">
                  <Loader2 className="h-8 w-8 animate-spin text-border" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart
                    data={revenueData}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="shipments"
                      stroke="#8884d8"
                      activeDot={{ r: 8 }}
                      name={t("Shipments")}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="revenue"
                      stroke="#82ca9d"
                      name={t("Revenue ($)")}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        )}

        {/* Customer-specific Reports */}
        {reportType === "customers" && (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>{t("Top Customers by Shipments")}</CardTitle>
                </CardHeader>
                <CardContent>
                  {customerDataLoading ? (
                    <div className="flex items-center justify-center h-[350px]">
                      <Loader2 className="h-8 w-8 animate-spin text-border" />
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={customerShipmentData?.map(c => ({ name: c.name, value: c.shipments || 0 }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#8884d8" name={t("Shipments")} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t("Top Customers by Revenue")}</CardTitle>
                </CardHeader>
                <CardContent>
                  {customerDataLoading ? (
                    <div className="flex items-center justify-center h-[350px]">
                      <Loader2 className="h-8 w-8 animate-spin text-border" />
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={customerShipmentData?.map(c => ({ name: c.name, revenue: c.revenue || 0 }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="revenue" fill="#82ca9d" name={t("Revenue ($)")} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>{t("Top Customers")}</CardTitle>
              </CardHeader>
              <CardContent>
                {customerDataLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-border" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("Customer")}</TableHead>
                        <TableHead>{t("Email")}</TableHead>
                        <TableHead className="text-right">{t("Shipments")}</TableHead>
                        <TableHead className="text-right">{t("Revenue")}</TableHead>
                        <TableHead className="text-right">{t("Avg Order Value")}</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customerShipmentData?.map((customer) => (
                        <TableRow key={customer.id}>
                          <TableCell className="font-medium">{customer.name}</TableCell>
                          <TableCell>{customer.email}</TableCell>
                          <TableCell className="text-right">{customer.shipments}</TableCell>
                          <TableCell className="text-right">${(customer.revenue || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                          <TableCell className="text-right">${(customer.avgOrderValue || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm">
                              {t("View Details")}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Shipment-specific Reports */}
        {reportType === "shipments" && (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>{t("Shipment Status Distribution")}</CardTitle>
                </CardHeader>
                <CardContent>
                  {statusLoading ? (
                    <div className="flex items-center justify-center h-[350px]">
                      <Loader2 className="h-8 w-8 animate-spin text-border" />
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={350}>
                      <PieChart>
                        <Pie
                          data={shipmentStatusData?.map(s => ({ name: s.name, value: s.value || 0 }))}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {shipmentStatusData?.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t("Destination Country Distribution")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie
                        data={sampleCountryDistributionData?.map(c => ({ name: c.name, value: c.value || 0 }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {sampleCountryDistributionData?.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>{t("Monthly Shipment Volume")}</CardTitle>
              </CardHeader>
              <CardContent>
                {revenueLoading ? (
                  <div className="flex items-center justify-center h-[350px]">
                    <Loader2 className="h-8 w-8 animate-spin text-border" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart
                      data={revenueData}
                      margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="shipments" fill="#8884d8" name={t("Shipments")} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Revenue-specific Reports */}
        {reportType === "revenue" && (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {t("Total Revenue")}
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {shipmentsLoading ? (
                    <div className="flex items-center justify-center h-[52px]">
                      <Loader2 className="h-8 w-8 animate-spin text-border" />
                    </div>
                  ) : (
                    <>
                      <div className="text-2xl font-bold">
                        ${(shipmentsData?.totalRevenue || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        +15.2% {t("from last month")}
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {t("Avg Revenue per Customer")}
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {shipmentsLoading || customerDataLoading ? (
                    <div className="flex items-center justify-center h-[52px]">
                      <Loader2 className="h-8 w-8 animate-spin text-border" />
                    </div>
                  ) : (
                    <>
                      <div className="text-2xl font-bold">
                        ${((shipmentsData?.totalRevenue || 0) / (shipmentsData?.activeCustomers || 1)).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        +5.2% {t("from last month")}
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {t("Avg Order Value")}
                  </CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {shipmentsLoading ? (
                    <div className="flex items-center justify-center h-[52px]">
                      <Loader2 className="h-8 w-8 animate-spin text-border" />
                    </div>
                  ) : (
                    <>
                      <div className="text-2xl font-bold">
                        ${(shipmentsData?.averageOrderValue || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        +2.5% {t("from last month")}
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {t("Growth Rate")}
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    +12.5%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    +3.2% {t("from last month")}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>{t("Monthly Revenue")}</CardTitle>
              </CardHeader>
              <CardContent>
                {revenueLoading ? (
                  <div className="flex items-center justify-center h-[350px]">
                    <Loader2 className="h-8 w-8 animate-spin text-border" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart
                      data={revenueData}
                      margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="revenue" fill="#82ca9d" name={t("Revenue ($)")} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("Customer Revenue Breakdown")}</CardTitle>
              </CardHeader>
              <CardContent>
                {customerDataLoading ? (
                  <div className="flex items-center justify-center h-[350px]">
                    <Loader2 className="h-8 w-8 animate-spin text-border" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie
                        data={customerShipmentData?.map(c => ({ name: c.name, revenue: c.revenue || 0 }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="revenue"
                      >
                        {customerShipmentData?.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `$${value}`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
}