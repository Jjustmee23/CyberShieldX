import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useClients } from "@/hooks/useClients";
import AddClientModal from "@/components/modals/AddClientModal";
import ScanModal from "@/components/modals/ScanModal";
import { Client, RiskLevel } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

export default function ClientsPage() {
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { clients, isLoading, error, refetchClients } = useClients();
  const { toast } = useToast();
  
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
        <h2 className="text-xl font-semibold mb-2">Failed to load clients</h2>
        <p className="text-gray-400 mb-4">
          There was an error loading the client data.
        </p>
        <Button
          onClick={() => refetchClients()}
          className="bg-primary text-white hover:bg-blue-600"
        >
          Try Again
        </Button>
      </div>
    );
  }

  // Filter clients based on search term and status filter
  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          client.clientId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || client.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Get initials for the client logo
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  // Get background color class based on client name
  const getClientColor = (name: string) => {
    const colors = [
      "bg-blue-100 text-blue-800",
      "bg-purple-100 text-purple-800",
      "bg-red-100 text-red-800",
      "bg-green-100 text-green-800",
      "bg-amber-100 text-amber-800",
    ];
    const hash = name
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  // Get risk level UI elements
  const getRiskLevelUI = (level: RiskLevel) => {
    switch (level) {
      case RiskLevel.LOW:
        return {
          className: "bg-green-100 text-green-800",
          icon: "fa-check-circle"
        };
      case RiskLevel.MEDIUM:
        return {
          className: "bg-amber-100 text-amber-800",
          icon: "fa-exclamation-circle"
        };
      case RiskLevel.HIGH:
        return {
          className: "bg-red-100 text-red-800",
          icon: "fa-times-circle"
        };
      default:
        return {
          className: "bg-gray-100 text-gray-800",
          icon: "fa-question-circle"
        };
    }
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

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Clients</h1>

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
            onClick={() => refetchClients()}
          >
            <i className="fas fa-sync-alt"></i>
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-col space-y-6">
        <Card className="bg-dark-lighter border-dark-light">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle>Client Management</CardTitle>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Search clients..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-dark border-dark-light pl-8 w-64"
                  />
                  <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" onValueChange={setStatusFilter}>
              <TabsList className="bg-dark border-dark-light mb-4">
                <TabsTrigger value="all">All Clients</TabsTrigger>
                <TabsTrigger value="online">Online</TabsTrigger>
                <TabsTrigger value="offline">Offline</TabsTrigger>
              </TabsList>
              
              <TabsContent value="all" className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredClients.length === 0 ? (
                    <div className="col-span-full text-center py-8 text-gray-400">
                      <i className="fas fa-users text-5xl mb-4"></i>
                      <p>No clients found</p>
                    </div>
                  ) : (
                    filteredClients.map(client => (
                      <Card key={client.id} className="bg-dark border-dark-light">
                        <CardContent className="pt-6">
                          <div className="flex items-start space-x-4">
                            <div className={`w-12 h-12 ${getClientColor(client.name)} rounded-md flex items-center justify-center text-lg font-semibold`}>
                              {getInitials(client.name)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-lg">{client.name}</h3>
                                <span className={`text-xs px-2 py-1 rounded-full ${client.status === 'online' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                  {client.status === 'online' ? 'Online' : 'Offline'}
                                </span>
                              </div>
                              <p className="text-sm text-gray-400">ID: {client.clientId}</p>
                              <div className="flex items-center mt-2">
                                <span className={`text-xs mr-2 px-2 py-1 rounded-full ${getRiskLevelUI(client.riskLevel).className}`}>
                                  <i className={`fas ${getRiskLevelUI(client.riskLevel).icon} mr-1`}></i>
                                  {client.riskLevel.charAt(0).toUpperCase() + client.riskLevel.slice(1)} Risk
                                </span>
                                <span className="text-xs text-gray-400">
                                  Last seen: {new Date(client.lastSeen).toLocaleString()}
                                </span>
                              </div>
                              <div className="flex mt-4 space-x-2">
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="border-dark-light text-gray-300 hover:bg-dark"
                                  onClick={() => handleStartScan(client)}
                                >
                                  <i className="fas fa-search mr-1"></i> Scan
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="border-dark-light text-gray-300 hover:bg-dark"
                                  onClick={() => handleGenerateReport(client)}
                                >
                                  <i className="fas fa-file-pdf mr-1"></i> Report
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="border-dark-light text-gray-300 hover:bg-dark"
                                >
                                  <i className="fas fa-cog mr-1"></i> Settings
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="online" className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredClients.length === 0 ? (
                    <div className="col-span-full text-center py-8 text-gray-400">
                      <i className="fas fa-users text-5xl mb-4"></i>
                      <p>No online clients found</p>
                    </div>
                  ) : (
                    filteredClients.map(client => (
                      <Card key={client.id} className="bg-dark border-dark-light">
                        <CardContent className="pt-6">
                          {/* Same content as above */}
                          <div className="flex items-start space-x-4">
                            <div className={`w-12 h-12 ${getClientColor(client.name)} rounded-md flex items-center justify-center text-lg font-semibold`}>
                              {getInitials(client.name)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-lg">{client.name}</h3>
                                <span className={`text-xs px-2 py-1 rounded-full ${client.status === 'online' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                  {client.status === 'online' ? 'Online' : 'Offline'}
                                </span>
                              </div>
                              <p className="text-sm text-gray-400">ID: {client.clientId}</p>
                              <div className="flex items-center mt-2">
                                <span className={`text-xs mr-2 px-2 py-1 rounded-full ${getRiskLevelUI(client.riskLevel).className}`}>
                                  <i className={`fas ${getRiskLevelUI(client.riskLevel).icon} mr-1`}></i>
                                  {client.riskLevel.charAt(0).toUpperCase() + client.riskLevel.slice(1)} Risk
                                </span>
                                <span className="text-xs text-gray-400">
                                  Last seen: {new Date(client.lastSeen).toLocaleString()}
                                </span>
                              </div>
                              <div className="flex mt-4 space-x-2">
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="border-dark-light text-gray-300 hover:bg-dark"
                                  onClick={() => handleStartScan(client)}
                                >
                                  <i className="fas fa-search mr-1"></i> Scan
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="border-dark-light text-gray-300 hover:bg-dark"
                                  onClick={() => handleGenerateReport(client)}
                                >
                                  <i className="fas fa-file-pdf mr-1"></i> Report
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="border-dark-light text-gray-300 hover:bg-dark"
                                >
                                  <i className="fas fa-cog mr-1"></i> Settings
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="offline" className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredClients.length === 0 ? (
                    <div className="col-span-full text-center py-8 text-gray-400">
                      <i className="fas fa-users text-5xl mb-4"></i>
                      <p>No offline clients found</p>
                    </div>
                  ) : (
                    filteredClients.map(client => (
                      <Card key={client.id} className="bg-dark border-dark-light">
                        <CardContent className="pt-6">
                          {/* Same content as above */}
                          <div className="flex items-start space-x-4">
                            <div className={`w-12 h-12 ${getClientColor(client.name)} rounded-md flex items-center justify-center text-lg font-semibold`}>
                              {getInitials(client.name)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-lg">{client.name}</h3>
                                <span className={`text-xs px-2 py-1 rounded-full ${client.status === 'online' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                  {client.status === 'online' ? 'Online' : 'Offline'}
                                </span>
                              </div>
                              <p className="text-sm text-gray-400">ID: {client.clientId}</p>
                              <div className="flex items-center mt-2">
                                <span className={`text-xs mr-2 px-2 py-1 rounded-full ${getRiskLevelUI(client.riskLevel).className}`}>
                                  <i className={`fas ${getRiskLevelUI(client.riskLevel).icon} mr-1`}></i>
                                  {client.riskLevel.charAt(0).toUpperCase() + client.riskLevel.slice(1)} Risk
                                </span>
                                <span className="text-xs text-gray-400">
                                  Last seen: {new Date(client.lastSeen).toLocaleString()}
                                </span>
                              </div>
                              <div className="flex mt-4 space-x-2">
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="border-dark-light text-gray-300 hover:bg-dark"
                                  onClick={() => handleStartScan(client)}
                                >
                                  <i className="fas fa-search mr-1"></i> Scan
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="border-dark-light text-gray-300 hover:bg-dark"
                                  onClick={() => handleGenerateReport(client)}
                                >
                                  <i className="fas fa-file-pdf mr-1"></i> Report
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="border-dark-light text-gray-300 hover:bg-dark"
                                >
                                  <i className="fas fa-cog mr-1"></i> Settings
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <AddClientModal
        isOpen={isAddClientModalOpen}
        onClose={() => setIsAddClientModalOpen(false)}
      />

      <ScanModal
        client={selectedClient}
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
      />
    </>
  );
}
