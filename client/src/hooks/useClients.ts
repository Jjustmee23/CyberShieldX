import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { Client, InsertClient } from "@/lib/types";

export function useClients() {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);

  const { data: clients = [], isLoading, error, refetch } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const addClientMutation = useMutation({
    mutationFn: async (clientData: InsertClient) => {
      setIsAdding(true);
      try {
        const response = await apiRequest("POST", "/api/clients", clientData);
        return response.json();
      } finally {
        setIsAdding(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
    },
  });

  const updateClientMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Client> }) => {
      const response = await apiRequest("PATCH", `/api/clients/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
    },
  });

  const deleteClientMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/clients/${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
    },
  });

  const addClient = async (clientData: InsertClient) => {
    return addClientMutation.mutateAsync(clientData);
  };

  const updateClient = async (id: number, data: Partial<Client>) => {
    return updateClientMutation.mutateAsync({ id, data });
  };

  const deleteClient = async (id: number) => {
    return deleteClientMutation.mutateAsync(id);
  };

  const refetchClients = () => {
    return refetch();
  };

  return {
    clients,
    isLoading,
    error,
    isAdding,
    addClient,
    updateClient,
    deleteClient,
    refetchClients,
  };
}
