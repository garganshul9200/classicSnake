import { Capacitor } from '@capacitor/core';
import {
  AdMob,
  BannerAdPluginEvents,
  BannerAdPosition,
  BannerAdSize,
  InterstitialAdPluginEvents,
  RewardAdPluginEvents,
  type PluginListenerHandle,
} from '@capacitor-community/admob';
import { AD_UNITS, INTERSTITIAL_EVERY_MS, USE_TEST_ADS } from './config';

let initialized = false;
let bannerVisible = false;
let sizeListener: PluginListenerHandle | null = null;
let rewardedBusy = false;
let interstitialBusy = false;
let sessionPlayMs = 0;

export function isNativeAds(): boolean {
  return Capacitor.isNativePlatform();
}

/** Resolved bottom system inset in CSS pixels (gesture / nav bar). */
export function safeBottomPx(): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--sab').trim();
  const n = parseFloat(raw);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
}

/** Call once at app start (native only). Safe to call repeatedly. */
export async function initializeAdMob(): Promise<void> {
  if (!isNativeAds() || initialized) return;
  try {
    await AdMob.initialize({
      testingDevices: [],
      initializeForTesting: USE_TEST_ADS,
    });
    initialized = true;
  } catch (err) {
    console.warn('[AdMob] initialize failed', err);
  }
}

export type BannerSizeHandler = (heightPx: number) => void;

/**
 * Show a bottom AdMob banner. Native overlay sits above the WebView — reserve
 * space in the React layout using the height reported via onSize.
 */
export async function showBannerAd(onSize?: BannerSizeHandler): Promise<void> {
  if (!isNativeAds()) return;
  await initializeAdMob();

  await sizeListener?.remove();
  sizeListener = await AdMob.addListener(BannerAdPluginEvents.SizeChanged, (size) => {
    const h = Math.max(0, Math.round(size.height ?? 0));
    onSize?.(h || 50);
  });

  try {
    await AdMob.showBanner({
      adId: AD_UNITS.banner,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      margin: 0,
      isTesting: USE_TEST_ADS,
    });
    bannerVisible = true;
    onSize?.(56);
  } catch (err) {
    console.warn('[AdMob] showBanner failed', err);
    onSize?.(0);
  }
}

export async function hideBannerAd(): Promise<void> {
  if (!isNativeAds() || !bannerVisible) {
    await sizeListener?.remove();
    sizeListener = null;
    return;
  }
  try {
    await AdMob.hideBanner();
    await AdMob.removeBanner();
  } catch (err) {
    console.warn('[AdMob] hideBanner failed', err);
  } finally {
    bannerVisible = false;
    await sizeListener?.remove();
    sizeListener = null;
  }
}

export async function prepareRewardedAd(): Promise<void> {
  if (!isNativeAds()) return;
  await initializeAdMob();
  try {
    await AdMob.prepareRewardVideoAd({
      adId: AD_UNITS.rewarded,
      isTesting: USE_TEST_ADS,
    });
  } catch (err) {
    console.warn('[AdMob] prepareRewardVideoAd failed', err);
  }
}

export async function showRewardedAd(): Promise<boolean> {
  if (!isNativeAds()) return false;
  if (rewardedBusy) return false;
  rewardedBusy = true;
  await initializeAdMob();

  const handles: PluginListenerHandle[] = [];
  const clearHandles = async () => {
    await Promise.all(handles.map((h) => h.remove()));
    handles.length = 0;
  };

  try {
    return await new Promise<boolean>((resolve) => {
      let rewarded = false;
      let settled = false;
      const finish = (ok: boolean) => {
        if (settled) return;
        settled = true;
        void clearHandles().then(() => resolve(ok));
      };

      void (async () => {
        try {
          handles.push(
            await AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
              rewarded = true;
            }),
            await AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
              finish(rewarded);
            }),
            await AdMob.addListener(RewardAdPluginEvents.FailedToLoad, () => {
              finish(false);
            }),
            await AdMob.addListener(RewardAdPluginEvents.FailedToShow, () => {
              finish(false);
            }),
          );

          await AdMob.prepareRewardVideoAd({
            adId: AD_UNITS.rewarded,
            isTesting: USE_TEST_ADS,
          });
          await AdMob.showRewardVideoAd();
          rewarded = true;
        } catch (err) {
          console.warn('[AdMob] showRewardedAd failed', err);
          finish(rewarded);
        }
      })();
    });
  } finally {
    rewardedBusy = false;
    await clearHandles();
  }
}

export async function prepareInterstitialAd(): Promise<void> {
  if (!isNativeAds()) return;
  await initializeAdMob();
  try {
    await AdMob.prepareInterstitial({
      adId: AD_UNITS.interstitial,
      isTesting: USE_TEST_ADS,
    });
  } catch (err) {
    console.warn('[AdMob] prepareInterstitial failed', err);
  }
}

export async function showInterstitialAd(): Promise<boolean> {
  if (!isNativeAds()) return false;
  if (interstitialBusy) return false;
  interstitialBusy = true;
  await initializeAdMob();

  const handles: PluginListenerHandle[] = [];
  const clearHandles = async () => {
    await Promise.all(handles.map((h) => h.remove()));
    handles.length = 0;
  };

  try {
    return await new Promise<boolean>((resolve) => {
      let settled = false;
      const finish = (ok: boolean) => {
        if (settled) return;
        settled = true;
        void clearHandles().then(() => resolve(ok));
      };

      void (async () => {
        try {
          handles.push(
            await AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
              finish(true);
            }),
            await AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, () => {
              finish(false);
            }),
            await AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, () => {
              finish(false);
            }),
          );

          await AdMob.prepareInterstitial({
            adId: AD_UNITS.interstitial,
            isTesting: USE_TEST_ADS,
          });
          await AdMob.showInterstitial();
        } catch (err) {
          console.warn('[AdMob] showInterstitialAd failed', err);
          finish(false);
        }
      })();
    });
  } finally {
    interstitialBusy = false;
    await clearHandles();
  }
}

/** Accumulate active playtime. Returns true when the threshold is reached. */
export function tickPlaytime(ms: number): boolean {
  sessionPlayMs += ms;
  if (sessionPlayMs < INTERSTITIAL_EVERY_MS) return false;
  sessionPlayMs = 0;
  return true;
}

export function resetPlaytime(): void {
  sessionPlayMs = 0;
}
