import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useClients } from "@/hooks/useClients";
import { useToast } from "@/hooks/use-toast";
import { Report } from "@/lib/types";

export default function ReportsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const { clients } = useClients();
  const { toast } = useToast();

  const { data: reports = [], isLoading, error, refetch } = useQuery<Report[]>({
    queryKey: ['/api/reports'],
  });

  // Filter reports based on search term and type filter
  const filteredReports = reports.filter(report => {
    const matchesSearch = report.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || report.type === typeFilter;
    return matchesSearch && matchesType;
  });

  // Function to get client name by ID
  const getClientName = (clientId: number) => {
    const client = clients.find(client => client.id === clientId);
    return client ? client.name : "Unknown Client";
  };

  // Get color class for report type
  const getReportTypeColor = (type: string) => {
    switch (type) {
      case "network":
        return "bg-blue-100/20 text-blue-500";
      case "system":
        return "bg-green-100/20 text-green-500";
      case "webapp":
        return "bg-purple-100/20 text-purple-500";
      case "full":
        return "bg-amber-100/20 text-amber-500";
      case "incident":
        return "bg-red-100/20 text-red-500";
      default:
        return "bg-gray-100/20 text-gray-500";
    }
  };

  // Get icon for report type
  const getReportTypeIcon = (type: string) => {
    switch (type) {
      case "network":
        return "fa-network-wired";
      case "system":
        return "fa-laptop";
      case "webapp":
        return "fa-globe";
      case "full":
        return "fa-shield-alt";
      case "incident":
        return "fa-exclamation-triangle";
      default:
        return "fa-file-alt";
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleDownloadReport = (report: Report) => {
    window.open(`/api/reports/${report.id}/export?format=pdf`, '_blank');
    
    toast({
      title: "Downloading Report",
      description: `Preparing ${report.title} for download...`,
    });
  };

  const handleShareReport = (report: Report) => {
    toast({
      title: "Share Report",
      description: `Preparing share options for ${report.title}...`,
    });

    // In a real app, this would open a sharing dialog
  };

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
        <h2 className="text-xl font-semibold mb-2">Failed to load reports</h2>
        <p className="text-gray-400 mb-4">
          There was an error loading the report data.
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

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Security Reports</h1>

        <div className="flex space-x-3">
          <Button
            className="bg-dark-lighter hover:bg-dark-light text-gray-200 px-4 py-2 rounded-md flex items-center space-x-2"
            onClick={() => refetch()}
          >
            <i className="fas fa-sync-alt"></i>
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      <Card className="bg-dark-lighter border-dark-light">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle>Report Library</CardTitle>
            <div className="w-full md:w-auto">
              <Input
                type="text"
                placeholder="Search reports..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-dark border-dark-light pl-8 w-full md:w-64 relative"
              />
              <i className="fas fa-search absolute -mt-7 ml-3 text-gray-400"></i>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" onValueChange={setTypeFilter}>
            <TabsList className="bg-dark border-dark-light mb-4">
              <TabsTrigger value="all">All Reports</TabsTrigger>
              <TabsTrigger value="network">Network</TabsTrigger>
              <TabsTrigger value="system">System</TabsTrigger>
              <TabsTrigger value="webapp">Web App</TabsTrigger>
              <TabsTrigger value="full">Full Scan</TabsTrigger>
              <TabsTrigger value="incident">Incident</TabsTrigger>
            </TabsList>
            
            <TabsContent value={typeFilter} className="mt-0">
              {filteredReports.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <i className="fas fa-file-alt text-5xl mb-4"></i>
                  <p>No reports found with the selected filter</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredReports.map(report => (
                    <Card key={report.id} className="bg-dark border-dark-light">
                      <CardContent className="pt-6">
                        <div className="flex items-start">
                          <div className={`w-10 h-10 rounded-md flex items-center justify-center ${getReportTypeColor(report.type)}`}>
                            <i className={`fas ${getReportTypeIcon(report.type)}`}></i>
                          </div>
                          <div className="ml-4 flex-1">
                            <h3 className="font-medium text-gray-100">{report.title}</h3>
                            <p className="text-sm text-gray-400">
                              {getClientName(report.clientId)} • {formatDate(report.createdAt)}
                            </p>
                            <div className="flex mt-4 space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-dark-light text-gray-300 hover:bg-dark flex-1"
                                onClick={() => handleDownloadReport(report)}
                              >
                                <i className="fas fa-download mr-2"></i>
                                Download
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-dark-light text-gray-300 hover:bg-dark"
                                onClick={() => handleShareReport(report)}
                              >
                                <i className="fas fa-share-alt"></i>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </>
  );
}
