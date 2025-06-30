// src/App.tsx
import * as React from "react";
import MainLayout from "./components/layout/MainLayout";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import "./styles/themes.css";

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <div className="App">
          <MainLayout />
        </div>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
