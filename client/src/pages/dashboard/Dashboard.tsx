import { useState } from "react";
import { Button } from "@/components/ui/button";
import StatusOverview from "@/components/dashboard/StatusOverview";
import ClientsTable from "@/components/dashboard/ClientsTable";
import ActiveScans from "@/components/dashboard/ActiveScans";
import RecentIncidents from "@/components/dashboard/RecentIncidents";
import ScanModal from "@/components/modals/ScanModal";
import AddClientModal from "@/components/modals/AddClientModal";
import { Client, Scan, Incident } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface DashboardData {
  totalClients: number;
  activeScansCount: number;
  activeScans: Scan[];
  securityIncidentsCount: number;
  recentIncidents: Incident[];
  trainingCompliance: number;
  clients: Client[];
}

export default function Dashboard() {
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const { toast } = useToast();

  const { data: dashboardData, error, isLoading, refetch } = useQuery<DashboardData>({
    queryKey: ['/api/dashboard/summary'],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-red-500 mb-4">
          <i className="fas fa-exclamation-triangle text-4xl"></i>
        </div>
        <h2 className="text-xl font-semibold mb-2">Failed to load dashboard</h2>
        <p className="text-gray-400 mb-4">
          There was an error loading the dashboard data.
        </p>
        <Button
          onClick={() => refetch()}
          className="bg-primary text-white hover:bg-blue-600"
        >
          Try Again
        </Button>
      </div>
    );
  }

  const handleViewDetails = (client: Client) => {
    // This would navigate to client details page in a real app
    console.log("View details for client", client.id);
  };

  const handleStartScan = (client: Client) => {
    setSelectedClient(client);
    setIsScanModalOpen(true);
  };

  const handleGenerateReport = (client: Client) => {
    toast({
      title: "Report Generation",
      description: `Generating report for ${client.name}. This may take a moment.`,
    });
    
    // In a real application, this would call an API to generate a report
    setTimeout(() => {
      toast({
        title: "Report Ready",
        description: `The report for ${client.name} is ready to download.`,
      });
    }, 3000);
  };

  const handleRefresh = () => {
    refetch();
  };

  const {
    totalClients = 0,
    activeScansCount = 0,
    activeScans = [],
    securityIncidentsCount = 0,
    recentIncidents = [],
    trainingCompliance = 0,
    clients = []
  } = dashboardData || {};

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>

        <div className="flex space-x-3">
          <Button
            className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-md flex items-center space-x-2"
            onClick={() => setIsAddClientModalOpen(true)}
          >
            <i className="fas fa-plus-circle"></i>
            <span>Add Client</span>
          </Button>

          <Button
            className="bg-dark-lighter hover:bg-dark-light text-gray-200 px-4 py-2 rounded-md flex items-center space-x-2"
            onClick={handleRefresh}
          >
            <i className="fas fa-sync-alt"></i>
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      <StatusOverview
        totalClients={totalClients}
        activeScansCount={activeScansCount}
        securityIncidentsCount={securityIncidentsCount}
        trainingCompliance={trainingCompliance}
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <ClientsTable
            clients={clients}
            onViewDetails={handleViewDetails}
            onStartScan={handleStartScan}
            onGenerateReport={handleGenerateReport}
          />
        </div>

        <div className="space-y-6">
          <ActiveScans scans={activeScans} />
          <RecentIncidents incidents={recentIncidents} />
        </div>
      </div>

      <ScanModal
        client={selectedClient}
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
      />

      <AddClientModal
        isOpen={isAddClientModalOpen}
        onClose={() => setIsAddClientModalOpen(false)}
      />
    </>
  );
}
