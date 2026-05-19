import React, { Component, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="min-h-screen bg-deep-slate flex items-center justify-center p-4">
          <div className="bg-surface-container border border-error/20 rounded-xl p-8 max-w-md text-center">
            <AlertTriangle size={48} className="mx-auto text-error mb-4" />
            <h2 className="text-xl font-bold text-text-primary mb-2">
              Algo salió mal
            </h2>
            <p className="text-text-secondary text-sm mb-4">
              Ocurrió un error inesperado. Intenta recargar la página.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-mint-precision text-deep-slate rounded-lg font-semibold hover:bg-white transition-colors"
            >
              Recargar página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
