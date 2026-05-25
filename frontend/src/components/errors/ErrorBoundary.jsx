import React from 'react';
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ErrorFallback = ({ error, resetErrorBoundary }) => {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-950">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-full">
              <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-500" />
            </div>
            <div>
              <CardTitle className="text-2xl">Oops! Something went wrong</CardTitle>
              <p className="text-muted-foreground mt-1">
                We're sorry for the inconvenience. The error has been logged.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isDevelopment && (
            <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg">
              <h3 className="font-semibold text-red-900 dark:text-red-300 mb-2">
                Error Details (Development Mode Only):
              </h3>
              <pre className="text-xs text-red-800 dark:text-red-400 overflow-auto max-h-40">
                {error.message}
                {'\n\n'}
                {error.stack}
              </pre>
            </div>
          )}

          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
              What you can try:
            </h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-blue-800 dark:text-blue-400">
              <li>Refresh the page to try again</li>
              <li>Check your internet connection</li>
              <li>Clear your browser cache and reload</li>
              <li>Go back to the home page</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <Button onClick={resetErrorBoundary} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Try Again
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/'} className="gap-2">
              <Home className="w-4 h-4" />
              Go Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const logError = (error, errorInfo) => {
  // Log to console in development
  console.error('Error Boundary caught an error:', error, errorInfo);

  // In production, you would send this to an error tracking service
  // Example: Sentry.captureException(error, { extra: errorInfo });
};

export const ErrorBoundary = ({ children }) => {
  return (
    <ReactErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={logError}
      onReset={() => {
        // Reset app state if needed
        window.location.reload();
      }}
    >
      {children}
    </ReactErrorBoundary>
  );
};

// Wrapper for specific sections
export const SectionErrorBoundary = ({ children, fallback }) => {
  const DefaultFallback = ({ error, resetErrorBoundary }) => (
    <Card className="border-red-200 bg-red-50 dark:bg-red-950/10 dark:border-red-900">
      <CardContent className="p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-900 dark:text-red-300 mb-1">
              Unable to load this section
            </h3>
            <p className="text-sm text-red-700 dark:text-red-400 mb-3">
              {process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while loading this content.'}
            </p>
            <Button size="sm" variant="outline" onClick={resetErrorBoundary} className="gap-2">
              <RefreshCw className="w-3 h-3" />
              Retry
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <ReactErrorBoundary
      FallbackComponent={fallback || DefaultFallback}
      onError={(error, errorInfo) => {
        console.error('Section Error:', error, errorInfo);
      }}
    >
      {children}
    </ReactErrorBoundary>
  );
};

export default ErrorBoundary;
