import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useScans } from "@/hooks/useScans";
import { useClients } from "@/hooks/useClients";
import { Scan, ScanStatus } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Spinner } from "lucide-react";

export default function ScansPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { scans, isLoading, error, refetchScans } = useScans();
  const { clients } = useClients();
  const { toast } = useToast();

  // Helper function to get client name by ID
  const getClientName = (clientId: number) => {
    const client = clients.find(client => client.id === clientId);
    return client ? client.name : "Unknown Client";
  };

  // Helper function to get client initials by name
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  // Helper function to get background color class based on client name
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

  // Filter scans based on status filter
  const filteredScans = scans.filter(scan => {
    if (statusFilter === "all") return true;
    return scan.status === statusFilter;
  });

  // Format date
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Get status badge class
  const getStatusBadge = (status: ScanStatus) => {
    switch (status) {
      case ScanStatus.PENDING:
        return "bg-gray-100 text-gray-800";
      case ScanStatus.IN_PROGRESS:
        return "bg-blue-100 text-blue-800";
      case ScanStatus.COMPLETED:
        return "bg-green-100 text-green-800";
      case ScanStatus.FAILED:
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Get scan type icon
  const getScanTypeIcon = (type: string) => {
    switch (type) {
      case "network":
        return "fa-network-wired";
      case "system":
        return "fa-laptop";
      case "webapp":
        return "fa-globe";
      case "full":
        return "fa-shield-alt";
      default:
        return "fa-search";
    }
  };

  const handleViewScanResults = (scan: Scan) => {
    if (scan.status !== ScanStatus.COMPLETED) {
      toast({
        title: "Scan not completed",
        description: "The scan results are not available until the scan completes.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Viewing Results",
      description: `Loading results for ${getClientName(scan.clientId)}...`,
    });
    
    // In a real app, this would navigate to a detailed results page
  };

  const handleCancelScan = (scan: Scan) => {
    if (scan.status !== ScanStatus.IN_PROGRESS && scan.status !== ScanStatus.PENDING) {
      toast({
        title: "Cannot cancel scan",
        description: "Only in-progress or pending scans can be cancelled.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Cancelling Scan",
      description: `Cancelling ${scan.type} scan for ${getClientName(scan.clientId)}...`,
    });
    
    // In a real app, this would call an API to cancel the scan
    setTimeout(() => {
      refetchScans();
      toast({
        title: "Scan Cancelled",
        description: `The scan has been cancelled successfully.`,
      });
    }, 1000);
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
        <h2 className="text-xl font-semibold mb-2">Failed to load scans</h2>
        <p className="text-gray-400 mb-4">
          There was an error loading the scan data.
        </p>
        <Button
          onClick={() => refetchScans()}
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
        <h1 className="text-2xl font-semibold">Security Scans</h1>

        <div className="flex space-x-3">
          <Button
            className="bg-dark-lighter hover:bg-dark-light text-gray-200 px-4 py-2 rounded-md flex items-center space-x-2"
            onClick={() => refetchScans()}
          >
            <i className="fas fa-sync-alt"></i>
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      <Card className="bg-dark-lighter border-dark-light">
        <CardHeader className="pb-4">
          <CardTitle>Scan History</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" onValueChange={setStatusFilter}>
            <TabsList className="bg-dark border-dark-light mb-4">
              <TabsTrigger value="all">All Scans</TabsTrigger>
              <TabsTrigger value="in-progress">In Progress</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="failed">Failed</TabsTrigger>
            </TabsList>
            
            <TabsContent value={statusFilter} className="mt-0">
              {filteredScans.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <i className="fas fa-search text-5xl mb-4"></i>
                  <p>No scans found with the selected filter</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredScans.map(scan => {
                    const clientName = getClientName(scan.clientId);
                    return (
                      <Card key={scan.id} className="bg-dark border-dark-light">
                        <CardContent className="pt-6">
                          <div className="flex flex-col md:flex-row justify-between">
                            <div className="flex items-start space-x-4">
                              <div className={`w-10 h-10 ${getClientColor(clientName)} rounded-md flex items-center justify-center`}>
                                <i className={`fas ${getScanTypeIcon(scan.type)}`}></i>
                              </div>
                              <div>
                                <div className="flex items-center space-x-2">
                                  <h3 className="font-medium">{clientName}</h3>
                                  <span className={`text-xs px-2 py-1 rounded-full ${getStatusBadge(scan.status as ScanStatus)}`}>
                                    {scan.status === ScanStatus.IN_PROGRESS ? 'In Progress' : 
                                     scan.status === ScanStatus.COMPLETED ? 'Completed' : 
                                     scan.status === ScanStatus.PENDING ? 'Pending' : 'Failed'}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-400">
                                  <span className="capitalize">{scan.type}</span> scan • Started {formatDate(new Date(scan.startedAt))}
                                </p>
                                {scan.status === ScanStatus.IN_PROGRESS && (
                                  <div className="mt-2">
                                    <div className="w-48 h-2 bg-dark rounded-full overflow-hidden">
                                      <div className="bg-blue-500 h-full" style={{ width: `${scan.progress}%` }}></div>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">{scan.progress}% complete</p>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-3 mt-4 md:mt-0">
                              {scan.status === ScanStatus.COMPLETED && (
                                <Button 
                                  size="sm" 
                                  className="bg-primary text-white hover:bg-blue-600"
                                  onClick={() => handleViewScanResults(scan)}
                                >
                                  <i className="fas fa-chart-bar mr-2"></i>
                                  View Results
                                </Button>
                              )}
                              {(scan.status === ScanStatus.IN_PROGRESS || scan.status === ScanStatus.PENDING) && (
                                <Button 
                                  size="sm" 
                                  variant="destructive"
                                  onClick={() => handleCancelScan(scan)}
                                >
                                  <i className="fas fa-times-circle mr-2"></i>
                                  Cancel Scan
                                </Button>
                              )}
                              {scan.status === ScanStatus.FAILED && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="border-dark-light text-gray-300 hover:bg-dark"
                                >
                                  <i className="fas fa-redo mr-2"></i>
                                  Retry
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </>
  );
}
