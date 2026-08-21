/**
 * AdMob unit IDs. Set USE_TEST_ADS true for emulator / debug so production
 * inventory is never requested by accident.
 *
 * Replace ADMOB_APP_ID + AD_UNITS with your AdMob console values before release,
 * and keep them in sync with AndroidManifest APPLICATION_ID.
 */
export const USE_TEST_ADS = false;

/** Must match AndroidManifest APPLICATION_ID. Google sample App ID while testing. */
export const ADMOB_APP_ID = 'ca-app-pub-2848005220802634~9745228690';

export const AD_UNITS = {
  banner: 'ca-app-pub-2848005220802634/5306611618',
  interstitial: 'ca-app-pub-2848005220802634/4796259541',
  rewarded: 'ca-app-pub-2848005220802634/7589943842',
} as const;

/** Show an interstitial after this much active playtime. */
export const INTERSTITIAL_EVERY_MS = 3 * 60_000;

/** Show an interstitial every N game-overs. */
export const INTERSTITIAL_EVERY_GAMES = 4;
