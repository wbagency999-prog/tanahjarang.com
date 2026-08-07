export interface AdSlotConfig {
  desktop: string;
  mobile: string;
}

export const ADS_ENABLED = Boolean(
  process.env.NEXT_PUBLIC_ADSENSE_CLIENT
);

export const AD_PUBLISHER_ID =
  process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "";

export const AD_SIZES: Record<string, AdSlotConfig> = {
  leaderboard: { desktop: "728x90", mobile: "320x50" },
  rectangle: { desktop: "336x280", mobile: "300x250" },
  skyscraper: { desktop: "300x600", mobile: "300x250" },
};
