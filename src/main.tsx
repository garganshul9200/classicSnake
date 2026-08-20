import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";
import { initializeAdMob, prepareInterstitialAd } from "./ads/admob";
import "./index.css";
import App from "./App";

async function initNativeShell() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: "#06120c" });
    await StatusBar.setOverlaysWebView({ overlay: true });
  } catch {
    /* Status bar API not available on this device */
  }

  try {
    await SplashScreen.hide();
  } catch {
    /* Splash screen already hidden */
  }

  try {
    await initializeAdMob();
    await prepareInterstitialAd();
  } catch {
    /* Ads optional at boot */
  }
}

void initNativeShell();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
