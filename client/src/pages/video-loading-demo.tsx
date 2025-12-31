import { useState } from "react";
import { VideoLoader, VideoLoadingOverlay, PageTransitionLoader } from "@/components/video-loader";
import { Button } from "@/components/ui/button";
import Layout from "@/components/layout";

export default function VideoLoadingDemo() {
  const [showOverlay, setShowOverlay] = useState(false);
  const [showPageLoader, setShowPageLoader] = useState(false);

  const triggerOverlay = () => {
    setShowOverlay(true);
    setTimeout(() => setShowOverlay(false), 3000);
  };

  const triggerPageLoader = () => {
    setShowPageLoader(true);
    setTimeout(() => setShowPageLoader(false), 3000);
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Video Loading Demo</h1>
          <p className="text-gray-600 mb-8">
            Test different video loading states for your application
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Inline Video Loader */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Small Video Loader</h2>
            <div className="flex justify-center py-8">
              <VideoLoader 
                size="small"
                message="Processing..."
                subtitle="Please wait"
              />
            </div>
          </div>

          {/* Medium Video Loader */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Medium Video Loader</h2>
            <div className="flex justify-center py-8">
              <VideoLoader 
                size="medium"
                message="Loading data..."
                subtitle="This may take a moment"
              />
            </div>
          </div>

          {/* Large Video Loader */}
          <div className="bg-white rounded-lg shadow-lg p-6 md:col-span-2">
            <h2 className="text-xl font-semibold mb-4">Large Video Loader</h2>
            <div className="flex justify-center py-8">
              <VideoLoader 
                size="large"
                message="Uploading shipment..."
                subtitle="Please do not close this window"
              />
            </div>
          </div>
        </div>

        {/* Demo Controls */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Interactive Demos</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Overlay Loading</h3>
                <p className="text-sm text-gray-600">Full-screen overlay with video</p>
              </div>
              <Button onClick={triggerOverlay}>Show Overlay</Button>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Page Transition</h3>
                <p className="text-sm text-gray-600">Page-level loading state</p>
              </div>
              <Button onClick={triggerPageLoader}>Show Page Loader</Button>
            </div>
          </div>
        </div>

        {/* Video Loader Without Text */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Video Only (No Text)</h2>
          <div className="flex justify-center py-8">
            <VideoLoader 
              size="medium"
              showText={false}
            />
          </div>
        </div>
      </div>

      {/* Overlays */}
      <VideoLoadingOverlay 
        isVisible={showOverlay}
        message="Processing your request..."
        subtitle="This is a full-screen overlay demo"
      />

      {showPageLoader && (
        <PageTransitionLoader 
          isLoading={true}
          message="Loading new page..."
        />
      )}
    </Layout>
  );
}