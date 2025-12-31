import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  pageName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details for debugging (without exposing sensitive data)
    console.error('Error caught by GlobalErrorBoundary:', {
      pageName: this.props.pageName,
      message: error.message,
      stack: error.stack?.substring(0, 500) // Limit stack trace length
    });
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    // For lazy loading errors, try reloading the current route
    // This will trigger the retry logic in lazyWithRetry
    if (this.props.pageName) {
      // Force a hard refresh to clear any cached failed imports
      window.location.reload();
    }
  };

  private isLazyLoadingError = (error: Error | null): boolean => {
    if (!error) return false;
    const message = error.message.toLowerCase();
    return message.includes('loading chunk') || 
           message.includes('failed to fetch') || 
           message.includes('mime type') ||
           message.includes('failed to load module');
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
          <Card className="max-w-lg w-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <CardTitle className="text-red-900">An Error Occurred</CardTitle>
                  <CardDescription>
                    {this.props.pageName 
                      ? `There was an issue loading the ${this.props.pageName} page` 
                      : 'Something unexpected happened'}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {this.isLazyLoadingError(this.state.error) ? (
                <>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-700">
                      The page resources failed to load. This can happen due to network issues or temporary server problems.
                    </p>
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    <p className="font-semibold mb-2">This is usually temporary. Please try:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Click "Try Again" to reload the page</li>
                      <li>Check your internet connection</li>
                      <li>Clear your browser cache if the issue persists</li>
                    </ul>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-700 font-mono">
                      {this.state.error?.message || 'An unexpected error occurred'}
                    </p>
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    <p>You can try:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Refreshing the page</li>
                      <li>Going back to the previous page</li>
                      <li>Contacting support if the issue persists</li>
                    </ul>
                  </div>
                </>
              )}

              <div className="flex gap-2">
                <Button 
                  onClick={this.handleReset}
                  className="flex-1"
                >
                  Try Again
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => window.history.back()}
                  className="flex-1"
                >
                  Go Back
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}