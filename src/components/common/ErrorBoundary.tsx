// src/components/common/ErrorBoundary.tsx
import { Component } from "react";
import type { ReactNode } from "react";

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
    // console.error("错误边界捕获到错误:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <h2 className="text-xl font-bold text-red-600 mb-4">
              出现了一个错误
            </h2>
            <p className="text-gray-600 mb-4">
              {this.state.error?.message || "应用程序遇到了意外错误"}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              重新加载页面
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
