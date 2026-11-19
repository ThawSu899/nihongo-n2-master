import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { ErrorBoundary } from '../src/presentation/components/ErrorBoundary';

const SafeChild = () => <div>Safe Content Loaded</div>;

const CrashingChild = () => {
  throw new Error('Test crash in component');
};

describe('ErrorBoundary & Resilient Failure Handling', () => {
  it('renders children cleanly when no error occurs', () => {
    const html = renderToString(
      React.createElement(
        ErrorBoundary,
        { componentName: 'TestSafe' },
        React.createElement(SafeChild)
      )
    );
    expect(html).toContain('Safe Content Loaded');
  });

  it('renders informative recovery card when a child component throws', () => {
    // Suppress console.error during expected test error boundary trigger
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // React 19 server renderToString will propagate unhandled render exceptions,
    // so we verify getDerivedStateFromError state transition and UI structure directly
    const derivedState = ErrorBoundary.getDerivedStateFromError(new Error('Fatal UI Crash'));
    expect(derivedState.hasError).toBe(true);
    expect(derivedState.error?.message).toBe('Fatal UI Crash');

    const boundaryInstance = new ErrorBoundary({
      children: React.createElement(SafeChild),
      componentName: 'TestCrash',
    });
    boundaryInstance.state = {
      hasError: true,
      error: new Error('Simulated Crash'),
      errorInfo: null,
    };

    const renderedFallback = renderToString(boundaryInstance.render() as React.ReactElement);
    expect(renderedFallback).toContain('အမှားတစ်ခု ဖြစ်ပေါ်ခဲ့သည်');
    expect(renderedFallback).toContain('Simulated Crash');
    expect(renderedFallback).toContain('ပြန်လည်ကြိုးစားမည်');

    consoleSpy.mockRestore();
  });

  it('supports custom fallback UI when provided', () => {
    const boundaryInstance = new ErrorBoundary({
      children: React.createElement(SafeChild),
      fallback: React.createElement('div', null, 'Custom Fallback Active'),
    });
    boundaryInstance.state = {
      hasError: true,
      error: new Error('Simulated Crash'),
      errorInfo: null,
    };

    const renderedFallback = renderToString(boundaryInstance.render() as React.ReactElement);
    expect(renderedFallback).toContain('Custom Fallback Active');
  });
});
