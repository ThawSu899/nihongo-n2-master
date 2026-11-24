import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

export interface ErrorBoundaryProps {
  children?: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  componentName?: string;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error(
      `[ErrorBoundary] Caught error in ${this.props.componentName || 'component'}:`,
      error,
      errorInfo.componentStack
    );
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onReset?.();
  };

  handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[320px] flex items-center justify-center p-6 bg-muted/50 rounded-3xl border border-border my-4 text-center select-none shadow-sm">
          <div className="max-w-md space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-xs">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-foreground">
                အမှားတစ်ခု ဖြစ်ပေါ်ခဲ့သည် (Error Encountered)
              </h3>
              <p className="text-xs text-muted-foreground mt-1 font-myanmar leading-relaxed">
                စနစ်တွင် မမျှော်လင့်ထားသော ပြဿနာတစ်ခု ကြုံတွေ့ခဲ့ရပါသည်။ အောက်ပါ ခလုတ်ကို နှိပ်၍ ပြန်လည်ကြိုးစားနိုင်ပါသည်။
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-muted rounded-xl border border-border/60 text-left text-xs font-mono text-foreground max-h-28 overflow-y-auto">
                <span className="font-semibold text-rose-600 dark:text-rose-400">
                  {this.state.error.name}:{' '}
                </span>
                {this.state.error.message}
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs flex items-center gap-2 transition shadow-xs cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>ပြန်လည်ကြိုးစားမည် (Retry)</span>
              </button>

              <button
                type="button"
                onClick={this.handleReload}
                className="px-4 py-2 rounded-xl bg-muted hover:bg-muted bg-muted hover:bg-muted text-foreground font-medium text-xs flex items-center gap-2 transition cursor-pointer"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Reload Page</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
