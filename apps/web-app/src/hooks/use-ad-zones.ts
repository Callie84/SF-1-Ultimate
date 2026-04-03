import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export type ZoneId =
  | "content-top"
  | "content-bottom"
  | "sidebar-top"
  | "sidebar-bottom"
  | "dashboard-top"
  | "community-top"
  | "journal-top"
  | "prices-top";

export interface AdSlot {
  html: string;
  isActive: boolean;
}

export interface ZoneConfig {
  id: ZoneId;
  adType: "rectangle" | "square";
  width: number;   // 0 = 100%
  height: number;  // px
  isActive: boolean;
  slotCount?: 1 | 3; // 3 = Oberfläche in 3 gleiche Slots aufteilen
  slots?: AdSlot[];  // per-slot HTML content
}

export interface AdZonesData {
  zones: ZoneConfig[];
  sidebarWidth: number; // px, 0 = auto/fit-content
}

const DEFAULT_ZONES: ZoneConfig[] = [
  { id: "content-top", adType: "rectangle", width: 0, height: 112, isActive: true, slotCount: 1, slots: [] },
  { id: "sidebar-bottom", adType: "square", width: 0, height: 250, isActive: true, slotCount: 1, slots: [] },
];

export function useAdZones() {
  return useQuery<AdZonesData>({
    queryKey: ["ad-zones"],
    queryFn: () => api.get("/api/community/ads/zones"),
    staleTime: 10 * 60 * 1000,
    placeholderData: { zones: DEFAULT_ZONES, sidebarWidth: 256 },
  });
}

export function useSaveAdZones() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { zones: ZoneConfig[]; sidebarWidth: number }) =>
      api.put("/api/community/ads/zones", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ad-zones"] });
    },
  });
}
