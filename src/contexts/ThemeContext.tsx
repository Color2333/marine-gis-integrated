// src/contexts/ThemeContext.tsx
import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

interface ThemeContextType {
  theme: string;
  language: string;
  setTheme: (theme: string) => void;
  setLanguage: (language: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [theme, setTheme] = useState<string>(() => {
    const saved = localStorage.getItem("theme");
    return saved || "light";
  });

  const [language, setLanguage] = useState<string>(() => {
    const saved = localStorage.getItem("language");
    return saved || "zh-CN";
  });

  // 保存主题到localStorage
  useEffect(() => {
    localStorage.setItem("theme", theme);
  }, [theme]);

  // 保存语言到localStorage
  useEffect(() => {
    localStorage.setItem("language", language);
  }, [language]);

  // 应用主题到DOM
  useEffect(() => {
    const root = document.documentElement;

    // 移除所有主题类
    root.classList.remove("theme-light", "theme-dark", "theme-ocean");

    // 添加当前主题类
    root.classList.add(`theme-${theme}`);

    // 设置CSS变量
    switch (theme) {
      case "dark":
        root.style.setProperty("--bg-primary", "#1a1a1a");
        root.style.setProperty("--bg-secondary", "#2d2d2d");
        root.style.setProperty("--bg-tertiary", "#374151");
        root.style.setProperty("--text-primary", "#ffffff");
        root.style.setProperty("--text-secondary", "#cccccc");
        root.style.setProperty("--text-muted", "#9ca3af");
        root.style.setProperty("--border-color", "#404040");
        root.style.setProperty("--border-light", "#374151");
        root.style.setProperty("--accent-color", "#3b82f6");
        root.style.setProperty("--accent-hover", "#2563eb");
        root.style.setProperty("--success-color", "#10b981");
        root.style.setProperty("--warning-color", "#f59e0b");
        root.style.setProperty("--error-color", "#ef4444");
        root.style.setProperty("--error-hover", "#dc2626");
        root.style.setProperty("--purple-color", "#8b5cf6");
        root.style.setProperty("--purple-hover", "#7c3aed");
        root.style.setProperty("--gray-color", "#9ca3af");
        root.style.setProperty("--gray-hover", "#6b7280");
        break;
      case "ocean":
        root.style.setProperty("--bg-primary", "#0f172a");
        root.style.setProperty("--bg-secondary", "#1e293b");
        root.style.setProperty("--bg-tertiary", "#334155");
        root.style.setProperty("--text-primary", "#f1f5f9");
        root.style.setProperty("--text-secondary", "#cbd5e1");
        root.style.setProperty("--text-muted", "#94a3b8");
        root.style.setProperty("--border-color", "#334155");
        root.style.setProperty("--border-light", "#475569");
        root.style.setProperty("--accent-color", "#06b6d4");
        root.style.setProperty("--accent-hover", "#0891b2");
        root.style.setProperty("--success-color", "#10b981");
        root.style.setProperty("--warning-color", "#f59e0b");
        root.style.setProperty("--error-color", "#ef4444");
        root.style.setProperty("--error-hover", "#dc2626");
        root.style.setProperty("--purple-color", "#8b5cf6");
        root.style.setProperty("--purple-hover", "#7c3aed");
        root.style.setProperty("--gray-color", "#64748b");
        root.style.setProperty("--gray-hover", "#475569");
        break;
      default: // light
        root.style.setProperty("--bg-primary", "#ffffff");
        root.style.setProperty("--bg-secondary", "#f8fafc");
        root.style.setProperty("--bg-tertiary", "#f1f5f9");
        root.style.setProperty("--text-primary", "#1f2937");
        root.style.setProperty("--text-secondary", "#6b7280");
        root.style.setProperty("--text-muted", "#9ca3af");
        root.style.setProperty("--border-color", "#e5e7eb");
        root.style.setProperty("--border-light", "#f3f4f6");
        root.style.setProperty("--accent-color", "#3b82f6");
        root.style.setProperty("--accent-hover", "#2563eb");
        root.style.setProperty("--success-color", "#10b981");
        root.style.setProperty("--warning-color", "#f59e0b");
        root.style.setProperty("--error-color", "#ef4444");
        root.style.setProperty("--error-hover", "#dc2626");
        root.style.setProperty("--purple-color", "#8b5cf6");
        root.style.setProperty("--purple-hover", "#7c3aed");
        root.style.setProperty("--gray-color", "#6b7280");
        root.style.setProperty("--gray-hover", "#4b5563");
        break;
    }
  }, [theme]);

  // 应用语言设置
  useEffect(() => {
    document.documentElement.lang =
      language === "zh-CN" ? "zh-CN" : language === "zh-TW" ? "zh-TW" : "en";
  }, [language]);

  return (
    <ThemeContext.Provider value={{ theme, language, setTheme, setLanguage }}>
      {children}
    </ThemeContext.Provider>
  );
};
