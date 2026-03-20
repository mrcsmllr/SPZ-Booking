import useSWR from "swr";
import { DateAvailabilityResponse } from "@/types/booking";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useAvailability(venueId: string, date: string) {
  const { data, error, isLoading, mutate } = useSWR<DateAvailabilityResponse>(
    venueId && date
      ? `/api/public/availability?venueId=${venueId}&date=${date}`
      : null,
    fetcher,
    {
      refreshInterval: 30000, // Alle 30 Sekunden Polling
      revalidateOnFocus: true,
      dedupingInterval: 5000,
    }
  );

  return {
    availability: data,
    isLoading,
    isError: error,
    refresh: mutate,
  };
}
