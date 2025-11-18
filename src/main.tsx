
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "jotai";
import App from "./App";
import "./styles/base.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { attachConsole } from "@tauri-apps/plugin-log";
import { initAppWindow } from "@/lib/windowState";
import "./i18n";

async function initializeLog() {
  await attachConsole();
  console.log("Tauri Log Console Attached.");
}

initializeLog();
initAppWindow();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Provider>
      <BrowserRouter>
        {}
        <ThemeProvider defaultTheme="dark">
          <App />
        </ThemeProvider>
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);
