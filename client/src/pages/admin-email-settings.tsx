import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Trash2, Plus, Users, MailCheck, Loader2 } from "lucide-react";
import Layout from "@/components/layout";

interface EmailNotificationSetting {
  id: number;
  emailType: string;
  displayName: string;
  description: string | null;
  category: string;
  isEnabled: boolean;
  isCritical: boolean;
  updatedAt: string;
  updatedBy: number | null;
}

interface AdminEmailRecipient {
  id: number;
  email: string;
  name: string | null;
  category: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  shipment: "Gönderi",
  tracking: "Takip & Teslimat",
  refund: "İade & Ürün İade",
  support: "Destek Talepleri",
  account: "Hesap",
  customs: "Gümrük",
};

const ADMIN_CATEGORY_LABELS: Record<string, string> = {
  new_user_registration: "Yeni Kullanıcı Kaydı",
  new_shipment: "Yeni Gönderi Oluşturuldu",
  delivery_issue: "Teslimat Sorunu",
  tracking_exception: "Takip İstisnası",
  admin_tracking_report: "Günlük Admin Takip Raporu",
  pickup_scheduled: "Pickup Planlandı",
  customs_charges: "Gümrük Masrafları",
  support_ticket: "Destek Talebi",
  refund_request: "İade Talebi",
  bulk_shipment_admin: "Toplu Gönderi (Admin)",
};

export default function AdminEmailSettings() {
  const [selectedCategory, setSelectedCategory] = useState<string>("new_user_registration");
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Queries
  const { data: emailSettings, isLoading: settingsLoading } = useQuery<EmailNotificationSetting[]>({
    queryKey: ["/api/admin/email-notification-settings"],
  });

  const { data: allRecipients, isLoading: recipientsLoading } = useQuery<AdminEmailRecipient[]>({
    queryKey: ["/api/admin/email-recipients"],
  });

  // Mutations
  const toggleEmailType = useMutation({
    mutationFn: async ({ emailType, isEnabled }: { emailType: string; isEnabled: boolean }) => {
      const res = await apiRequest("PATCH", `/api/admin/email-notification-settings/${emailType}`, { isEnabled });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-notification-settings"] });
      toast({ title: "Güncellendi", description: "Email ayarı güncellendi." });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "Güncelleme başarısız", variant: "destructive" });
    },
  });

  const toggleRecipient = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const res = await apiRequest("PATCH", `/api/admin/email-recipients/${id}`, { isActive });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-recipients"] });
      toast({ title: "Güncellendi", description: "Alıcı durumu güncellendi." });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const addRecipient = useMutation({
    mutationFn: async (data: { email: string; name?: string; category: string }) => {
      const res = await apiRequest("POST", "/api/admin/email-recipients", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-recipients"] });
      setNewEmail("");
      setNewName("");
      toast({ title: "Eklendi", description: "Yeni alıcı eklendi." });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "Ekleme başarısız", variant: "destructive" });
    },
  });

  const deleteRecipient = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/email-recipients/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-recipients"] });
      toast({ title: "Silindi", description: "Alıcı silindi." });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  // Group settings by category
  const settingsByCategory = (emailSettings || []).reduce((acc, setting) => {
    if (!acc[setting.category]) acc[setting.category] = [];
    acc[setting.category].push(setting);
    return acc;
  }, {} as Record<string, EmailNotificationSetting[]>);

  // Filter recipients by selected category
  const filteredRecipients = (allRecipients || []).filter(r => r.category === selectedCategory);

  const handleAddRecipient = () => {
    if (!newEmail.trim()) return;
    addRecipient.mutate({
      email: newEmail.trim(),
      name: newName.trim() || undefined,
      category: selectedCategory,
    });
  };

  return (
    <Layout>
      <div className="container mx-auto p-6 max-w-5xl">
        <div className="flex items-center gap-3 mb-6">
          <Mail className="h-7 w-7 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Email Ayarları</h1>
            <p className="text-sm text-gray-500">Müşteri email bildirimlerini ve admin alıcılarını yönetin</p>
          </div>
        </div>

        <Tabs defaultValue="customer-emails" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="customer-emails" className="flex items-center gap-2">
              <MailCheck className="h-4 w-4" />
              Müşteri Emailleri
            </TabsTrigger>
            <TabsTrigger value="admin-recipients" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Admin Alıcıları
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Customer Email Toggles */}
          <TabsContent value="customer-emails" className="mt-4 space-y-4">
            {settingsLoading ? (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  <span className="ml-2 text-gray-500">Yükleniyor...</span>
                </CardContent>
              </Card>
            ) : (
              Object.entries(settingsByCategory).map(([category, settings]) => (
                <Card key={category}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{CATEGORY_LABELS[category] || category}</CardTitle>
                    <CardDescription>
                      {settings.filter(s => s.isEnabled).length}/{settings.length} aktif
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[250px]">Email Tipi</TableHead>
                          <TableHead>Açıklama</TableHead>
                          <TableHead className="w-[100px] text-center">Durum</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {settings.map((setting) => (
                          <TableRow key={setting.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {setting.isCritical && <Lock className="h-4 w-4 text-amber-500" />}
                                {setting.displayName}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-gray-500">
                              {setting.description}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-2">
                                <Switch
                                  checked={setting.isEnabled}
                                  onCheckedChange={(checked) =>
                                    toggleEmailType.mutate({ emailType: setting.emailType, isEnabled: checked })
                                  }
                                  disabled={setting.isCritical || toggleEmailType.isPending}
                                />
                                <Badge variant={setting.isEnabled ? "default" : "secondary"} className="text-xs">
                                  {setting.isEnabled ? "Açık" : "Kapalı"}
                                </Badge>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))
            )}

            {!settingsLoading && Object.keys(settingsByCategory).length === 0 && (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  Email ayarları henüz yüklenmedi. Sunucu yeniden başlatıldığında otomatik oluşturulacak.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tab 2: Admin Email Recipients */}
          <TabsContent value="admin-recipients" className="mt-4 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Admin Bildirim Alıcıları</CardTitle>
                <CardDescription>
                  Her bildirim kategorisi için hangi admin adreslerine email gönderileceğini ayarlayın
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Category Selector */}
                <div className="flex items-center gap-3">
                  <Label className="text-sm font-medium whitespace-nowrap">Kategori:</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-[320px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ADMIN_CATEGORY_LABELS).map(([key, label]) => {
                        const count = (allRecipients || []).filter(r => r.category === key && r.isActive).length;
                        return (
                          <SelectItem key={key} value={key}>
                            {label} ({count} alıcı)
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Recipients Table */}
                {recipientsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  </div>
                ) : filteredRecipients.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead className="w-[150px]">İsim</TableHead>
                        <TableHead className="w-[100px] text-center">Aktif</TableHead>
                        <TableHead className="w-[80px] text-center">Sil</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRecipients.map((recipient) => (
                        <TableRow key={recipient.id}>
                          <TableCell className="font-mono text-sm">{recipient.email}</TableCell>
                          <TableCell className="text-sm text-gray-600">{recipient.name || "-"}</TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={recipient.isActive}
                              onCheckedChange={(checked) =>
                                toggleRecipient.mutate({ id: recipient.id, isActive: checked })
                              }
                              disabled={toggleRecipient.isPending}
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteRecipient.mutate(recipient.id)}
                              disabled={deleteRecipient.isPending}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-6 text-gray-500 text-sm">
                    Bu kategori için alıcı bulunamadı.
                  </div>
                )}

                {/* Add New Recipient */}
                <div className="border-t pt-4 mt-4">
                  <Label className="text-sm font-medium mb-2 block">Yeni Alıcı Ekle</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="email"
                      placeholder="Email adresi"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="flex-1"
                      onKeyDown={(e) => e.key === "Enter" && handleAddRecipient()}
                    />
                    <Input
                      type="text"
                      placeholder="İsim (opsiyonel)"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-[180px]"
                      onKeyDown={(e) => e.key === "Enter" && handleAddRecipient()}
                    />
                    <Button
                      onClick={handleAddRecipient}
                      disabled={!newEmail.trim() || addRecipient.isPending}
                      className="gap-1"
                    >
                      <Plus className="h-4 w-4" />
                      Ekle
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
