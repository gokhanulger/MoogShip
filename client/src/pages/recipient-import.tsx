import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import Layout from "@/components/layout";
import { Link } from "wouter";

interface CSVRecipient {
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  phone: string;
  email: string;
}

interface ImportStats {
  success: number;
  failed: number;
  total: number;
  errors: string[];
}

export default function RecipientImport() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [importStats, setImportStats] = useState<ImportStats | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // CSV template string
  const csvTemplate = "name,address,city,state,country,postalCode,phone,email\nJohn Doe,123 Main St,New York,NY,USA,10001,+1234567890,john@example.com\nCompany Inc,789 Business Ave,Chicago,IL,USA,,,info@company.com";

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      // Reset import stats when a new file is selected
      setImportStats(null);
    }
  };

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      setIsUploading(true);
      try {
        const response = await fetch("/api/recipients/import", {
          method: "POST",
          body: formData,
          credentials: "include",
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || "Failed to import recipients");
        }

        return await response.json();
      } finally {
        setIsUploading(false);
      }
    },
    onSuccess: (data) => {
      setImportStats({
        success: data.success,
        failed: data.failed,
        total: data.total,
        errors: data.errors || []
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/recipients"] });
      
      toast({
        title: data.success > 0 ? "Import completed" : "Import completed with warnings",
        description: data.failed > 0 
          ? `Imported ${data.success} recipients. ${data.failed} records had errors. See details below.` 
          : `Successfully imported all ${data.success} recipients.`,
        variant: data.failed > 0 ? "default" : "default", // Using default variant as success is not available
        duration: 5000,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive",
        duration: 5000,
      });
    },
  });

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a CSV file to import",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    importMutation.mutate(formData);
  };

  // Generate and download CSV template
  const downloadTemplate = () => {
    const blob = new Blob([csvTemplate], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "recipient_template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      <div className="container mx-auto py-8">
        <header className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Import Recipients</h1>
            <p className="text-gray-600">Bulk import recipients from a CSV file</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/recipients">Back to Recipients</Link>
            </Button>
            <Button onClick={downloadTemplate}>Download Template</Button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Upload Recipients</CardTitle>
              <CardDescription>
                Upload a CSV file containing recipient information. The file should have the
                following columns: name, address, city, state, country, postalCode, phone, email.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="file">CSV File</Label>
                    <Input 
                      id="file" 
                      type="file" 
                      accept=".csv" 
                      onChange={handleFileChange}
                      disabled={isUploading}
                    />
                  </div>
                </div>
                <Button 
                  type="submit" 
                  className="mt-4 w-full" 
                  disabled={!file || isUploading}
                >
                  {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isUploading ? "Uploading..." : "Import Recipients"}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="flex flex-col items-start gap-2">
              <p className="text-sm text-gray-500">
                <strong>Note:</strong> Duplicate recipients will be skipped. A recipient is
                considered a duplicate if the name and address match an existing entry.
              </p>
              <p className="text-sm text-gray-500">
                <strong>Tip:</strong> Make sure your CSV file is properly formatted with columns matching
                exactly as shown in the template. Use the "Download Template" button to get started.
              </p>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>CSV Format</CardTitle>
              <CardDescription>
                Your CSV file should follow this format exactly. The first row must be the header row with
                column names exactly as shown below (case-sensitive).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 p-4 rounded-md overflow-x-auto">
                <pre className="text-xs whitespace-pre-wrap text-gray-800">{csvTemplate}</pre>
              </div>
              <div className="mt-4 space-y-2">
                <h3 className="font-semibold">Required Fields:</h3>
                <ul className="list-disc list-inside text-sm space-y-1">
                  <li><strong>name</strong>: Full recipient name</li>
                  <li><strong>address</strong>: Street address</li>
                  <li><strong>city</strong>: City or town</li>
                  <li><strong>country</strong>: Country name</li>
                </ul>
                <h3 className="font-semibold mt-2">Optional Fields:</h3>
                <ul className="list-disc list-inside text-sm space-y-1">
                  <li><strong>state</strong>: State or province</li>
                  <li><strong>postalCode</strong>: Postal or zip code</li>
                  <li><strong>phone</strong>: Phone number</li>
                  <li><strong>email</strong>: Email address</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {importStats && (
          <div className="mt-8">
            <Alert variant={importStats.failed > 0 && importStats.success === 0 ? "destructive" : "default"}>
              <div className="flex items-start">
                {importStats.failed > 0 && importStats.success === 0
                  ? <AlertCircle className="h-5 w-5 mr-2 mt-0.5 text-destructive" /> 
                  : importStats.failed > 0
                    ? <AlertCircle className="h-5 w-5 mr-2 mt-0.5" />
                    : <CheckCircle2 className="h-5 w-5 mr-2 mt-0.5 text-green-500" />
                }
                <div>
                  <AlertTitle>
                    {importStats.failed > 0 && importStats.success === 0
                      ? "Import Failed"
                      : importStats.failed > 0
                        ? "Import Completed with Warnings"
                        : "Import Successful"
                    }
                  </AlertTitle>
                  <AlertDescription>
                    <div className="mt-2">
                      <p><strong>Total records:</strong> {importStats.total}</p>
                      <p><strong>Successfully imported:</strong> {importStats.success}</p>
                      <p><strong>Failed to import:</strong> {importStats.failed}</p>
                    </div>
                    
                    {importStats.errors.length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-bold">Errors:</h4>
                        <ul className="list-disc list-inside mt-2 space-y-1">
                          {importStats.errors.map((error, index) => (
                            <li key={index} className="text-sm">{error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          </div>
        )}
      </div>
    </Layout>
  );
}