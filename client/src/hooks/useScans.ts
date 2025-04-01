import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { Scan, InsertScan, ScanType, ScanStatus } from "@/lib/types";
import { useClients } from "@/hooks/useClients";

export function useScans() {
  const queryClient = useQueryClient();
  const [isStarting, setIsStarting] = useState(false);
  const { clients } = useClients();

  const { data: scans = [], isLoading, error, refetch } = useQuery<Scan[]>({
    queryKey: ["/api/scans"],
    select: (data) => {
      // Enrich scans with client data
      return data.map(scan => {
        const client = clients.find(c => c.id === scan.clientId);
        return {
          ...scan,
          client
        };
      });
    }
  });

  const startScanMutation = useMutation({
    mutationFn: async (scanData: InsertScan) => {
      setIsStarting(true);
      try {
        const response = await apiRequest("POST", "/api/scans", scanData);
        return response.json();
      } finally {
        setIsStarting(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
    },
  });

  const updateScanMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Scan> }) => {
      const response = await apiRequest("PATCH", `/api/scans/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
    },
  });

  const startScan = async (scanData: InsertScan) => {
    return startScanMutation.mutateAsync({
      ...scanData,
      status: ScanStatus.PENDING,
    });
  };

  const updateScan = async (id: number, data: Partial<Scan>) => {
    return updateScanMutation.mutateAsync({ id, data });
  };

  const getScansByClient = (clientId: number) => {
    return scans.filter(scan => scan.clientId === clientId);
  };

  const getActiveScansByClient = (clientId: number) => {
    return scans.filter(
      scan => scan.clientId === clientId && scan.status === ScanStatus.IN_PROGRESS
    );
  };

  const refetchScans = () => {
    return refetch();
  };

  return {
    scans,
    isLoading,
    error,
    isStarting,
    startScan,
    updateScan,
    getScansByClient,
    getActiveScansByClient,
    refetchScans,
  };
}
