import { useEffect, useState } from 'react';
import { hideBannerAd, isNativeAds, showBannerAd } from '../ads/admob';
import { cn } from '../utils/cn';

/**
 * Bottom banner slot. Native AdMob overlays the WebView — this spacer keeps
 * joystick / UI clear of the ad and the system gesture bar.
 */
export function BannerAd({
  enabled,
  className,
}: {
  enabled: boolean;
  className?: string;
}) {
  const native = isNativeAds();
  const [height, setHeight] = useState(enabled && native ? 56 : 0);

  useEffect(() => {
    if (!enabled) {
      setHeight(0);
      void hideBannerAd();
      return;
    }

    if (!native) {
      setHeight(0);
      return;
    }

    let alive = true;
    void showBannerAd((h) => {
      if (alive) setHeight(h);
    });

    return () => {
      alive = false;
      void hideBannerAd();
    };
  }, [enabled, native]);

  if (!enabled || height <= 0) return null;

  return (
    <div
      className={cn('relative shrink-0 overflow-hidden', className)}
      style={{ height }}
      aria-hidden
    />
  );
}
