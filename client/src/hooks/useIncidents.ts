import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { Incident, InsertIncident } from "@/lib/types";
import { useClients } from "@/hooks/useClients";

export function useIncidents() {
  const queryClient = useQueryClient();
  const { clients } = useClients();

  const { data: incidents = [], isLoading, error, refetch } = useQuery<Incident[]>({
    queryKey: ["/api/incidents"],
    select: (data) => {
      // Enrich incidents with client data
      return data.map(incident => {
        const client = clients.find(c => c.id === incident.clientId);
        return {
          ...incident,
          client
        };
      });
    }
  });

  const createIncidentMutation = useMutation({
    mutationFn: async (incidentData: InsertIncident) => {
      const response = await apiRequest("POST", "/api/incidents", incidentData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
    },
  });

  const updateIncidentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Incident> }) => {
      const response = await apiRequest("PATCH", `/api/incidents/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
    },
  });

  const createIncident = async (incidentData: InsertIncident) => {
    return createIncidentMutation.mutateAsync(incidentData);
  };

  const updateIncident = async (id: number, data: Partial<Incident>) => {
    return updateIncidentMutation.mutateAsync({ id, data });
  };

  const getIncidentsByClient = (clientId: number) => {
    return incidents.filter(incident => incident.clientId === clientId);
  };

  const getRecentIncidents = (limit: number = 5) => {
    return [...incidents]
      .sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime())
      .slice(0, limit);
  };

  const getUnresolvedIncidents = () => {
    return incidents.filter(incident => incident.status === "unresolved");
  };

  const refetchIncidents = () => {
    return refetch();
  };

  return {
    incidents,
    isLoading,
    error,
    createIncident,
    updateIncident,
    getIncidentsByClient,
    getRecentIncidents,
    getUnresolvedIncidents,
    refetchIncidents,
  };
}
