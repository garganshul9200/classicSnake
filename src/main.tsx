import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";
import "./index.css";
import App from "./App";

async function initNativeShell() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: "#05010f" });
    await StatusBar.setOverlaysWebView({ overlay: true });
  } catch {
    /* Status bar API not available on this device */
  }

  try {
    await SplashScreen.hide();
  } catch {
    /* Splash screen already hidden */
  }
}

void initNativeShell();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
