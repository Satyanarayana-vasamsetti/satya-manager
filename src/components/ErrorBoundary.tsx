import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center max-w-md mx-auto my-12 bg-white rounded-3xl shadow-sm border border-gray-100">
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <AlertCircle size={24} />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">Something went wrong</h2>
          <p className="text-xs text-gray-500 mb-5">
            {this.state.error?.message || 'An unexpected error occurred while loading this view.'}
          </p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-4 py-2.5 bg-rosegold-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-transform"
            >
              <RefreshCw size={13} /> Reload Page
            </button>
            <Link
              to="/"
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold flex items-center gap-1.5 active:bg-gray-200 transition-colors"
            >
              <Home size={13} /> Dashboard
            </Link>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
