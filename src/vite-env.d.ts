/// <reference types="vite/client" />

// 全局类型声明
declare global {
  interface Window {
    require: (
      deps: string[], 
      callback: (...modules: any[]) => void, 
      errback?: (error: any) => void
    ) => void;
  }
}
