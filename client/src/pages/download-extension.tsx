import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FolderOpen, Chrome } from "lucide-react";

export default function DownloadExtension() {
  const handleDownloadAll = async () => {
    // Create a zip file with all extension files
    const files = [
      'manifest.json',
      'content-simple.js',
      'popup.html',
      'popup.js',
      'content.css'
    ];
    
    alert('Please download each file from the links below and save them in the same folder.');
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Chrome className="h-6 w-6" />
            Download MoogShip Chrome Extension
          </CardTitle>
          <CardDescription>
            Follow these steps to install the Etsy order importer extension
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Step 1: Download All Files</h3>
            <p className="text-sm text-muted-foreground">
              Create a new folder on your computer called "moogship-extension" and download all these files into it:
            </p>
            
            <div className="grid gap-2">
              <a href="/chrome-extension/manifest.json" download className="flex items-center gap-2 p-3 border rounded hover:bg-accent">
                <Download className="h-4 w-4" />
                <span className="font-mono text-sm">manifest.json</span>
                <span className="text-xs text-muted-foreground ml-auto">Extension configuration</span>
              </a>
              
              <a href="/chrome-extension/content-simple.js" download className="flex items-center gap-2 p-3 border rounded hover:bg-accent">
                <Download className="h-4 w-4" />
                <span className="font-mono text-sm">content-simple.js</span>
                <span className="text-xs text-muted-foreground ml-auto">Main script</span>
              </a>
              
              <a href="/chrome-extension/popup.html" download className="flex items-center gap-2 p-3 border rounded hover:bg-accent">
                <Download className="h-4 w-4" />
                <span className="font-mono text-sm">popup.html</span>
                <span className="text-xs text-muted-foreground ml-auto">Extension popup</span>
              </a>
              
              <a href="/chrome-extension/popup.js" download className="flex items-center gap-2 p-3 border rounded hover:bg-accent">
                <Download className="h-4 w-4" />
                <span className="font-mono text-sm">popup.js</span>
                <span className="text-xs text-muted-foreground ml-auto">Popup script</span>
              </a>
              
              <a href="/chrome-extension/content.css" download className="flex items-center gap-2 p-3 border rounded hover:bg-accent">
                <Download className="h-4 w-4" />
                <span className="font-mono text-sm">content.css</span>
                <span className="text-xs text-muted-foreground ml-auto">Styles</span>
              </a>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Step 2: Install in Chrome</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Open Chrome and go to: <code className="bg-muted px-2 py-1 rounded">chrome://extensions/</code></li>
              <li>Enable "Developer mode" (toggle in top-right corner)</li>
              <li>Click "Load unpacked"</li>
              <li>Select the folder where you downloaded all the files</li>
              <li>Click "Select Folder"</li>
            </ol>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Step 3: Configure Extension</h3>
            <div className="space-y-2 p-4 bg-muted rounded">
              <p className="text-sm font-medium">Your Settings:</p>
              <div className="space-y-1">
                <p className="text-sm"><strong>API Token:</strong></p>
                <code className="block bg-background p-2 rounded text-xs break-all">Mjpnb2toYW5AbW9vZ2NvLmNvbQ==</code>
              </div>
              <div className="space-y-1 mt-2">
                <p className="text-sm"><strong>API URL:</strong></p>
                <code className="block bg-background p-2 rounded text-xs break-all">https://64a16594-abd1-49b2-9383-39620759d013-00-12hpoujf36yq8.worf.replit.dev/api/etsy-import/import</code>
              </div>
            </div>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Click the extension icon in Chrome toolbar</li>
              <li>Paste the API Token and URL from above</li>
              <li>Click "Save Settings"</li>
            </ol>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Step 4: Use on Etsy</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Go to your Etsy orders page</li>
              <li>Look for the purple "Import to MoogShip" button (bottom-right)</li>
              <li>Click it to import your orders!</li>
            </ol>
          </div>
          
          <div className="p-4 border-l-4 border-yellow-500 bg-yellow-50">
            <p className="text-sm text-yellow-800">
              <strong>Troubleshooting:</strong> If you don't see the import button on Etsy, try refreshing the page. 
              Check the browser console (F12) for any error messages starting with "🚀 MoogShip".
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}