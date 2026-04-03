"use client";
import { useAdZones, ZoneId } from "@/hooks/use-ad-zones";
import { AdCarousel } from "@/components/ads/ad-carousel";

export function ZoneBanner({ zoneId }: { zoneId: ZoneId }) {
  const { data } = useAdZones();
  const zone = (data?.zones ?? []).find((z) => z.id === zoneId && z.isActive);
  if (!zone) return null;
  return (
    <div className="w-full mb-4" style={{ height: zone.height }}>
      <AdCarousel type={zone.adType} autoPlayInterval={7000} showControls={false} />
    </div>
  );
}
