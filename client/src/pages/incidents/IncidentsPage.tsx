import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIncidents } from "@/hooks/useIncidents";
import { useClients } from "@/hooks/useClients";
import { Incident, IncidentSeverity, IncidentStatus } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface ResolveIncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  incident: Incident | null;
  onResolve: (id: number, notes: string) => void;
}

function ResolveIncidentModal({ isOpen, onClose, incident, onResolve }: ResolveIncidentModalProps) {
  const [resolutionNotes, setResolutionNotes] = useState("");
  
  const handleSubmit = () => {
    if (!incident) return;
    
    if (!resolutionNotes.trim()) {
      return; // Show validation error
    }
    
    onResolve(incident.id, resolutionNotes);
    setResolutionNotes("");
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-dark-lighter text-gray-100 border-dark-light max-w-md">
        <DialogHeader>
          <DialogTitle>Resolve Incident</DialogTitle>
          <DialogDescription className="text-gray-400">
            {incident && <>Add resolution details for "{incident.title}"</>}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-200">Resolution Notes</label>
            <Textarea
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="Describe how this incident was resolved..."
              className="bg-dark border-dark-light text-gray-100 min-h-[120px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="border-dark-light text-gray-300 hover:bg-dark-light"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-primary text-white hover:bg-blue-600"
          >
            Mark as Resolved
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function IncidentsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  
  const { incidents, isLoading, error, updateIncident, refetchIncidents } = useIncidents();
  const { clients } = useClients();
  const { toast } = useToast();

  // Get client name by ID
  const getClientName = (clientId: number) => {
    const client = clients.find(client => client.id === clientId);
    return client ? client.name : "Unknown Client";
  };

  // Filter incidents based on search, status, and severity
  const filteredIncidents = incidents.filter(incident => {
    const matchesSearch = 
      incident.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      incident.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || incident.status === statusFilter;
    const matchesSeverity = severityFilter === "all" || incident.severity === severityFilter;
    return matchesSearch && matchesStatus && matchesSeverity;
  });

  // Get icon for incident type
  const getIncidentIcon = (type: string) => {
    switch (type) {
      case "suspicious-login":
        return "fa-exclamation-triangle";
      case "malware":
        return "fa-virus";
      case "firewall":
        return "fa-shield-alt";
      case "vulnerability":
        return "fa-bug";
      case "phishing":
        return "fa-user-secret";
      default:
        return "fa-exclamation-circle";
    }
  };

  // Get background color for incident severity
  const getSeverityColor = (severity: IncidentSeverity) => {
    switch (severity) {
      case IncidentSeverity.HIGH:
        return "bg-red-100 text-red-600";
      case IncidentSeverity.MEDIUM:
        return "bg-amber-100 text-amber-600";
      case IncidentSeverity.LOW:
        return "bg-green-100 text-green-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  // Get status badge color
  const getStatusBadge = (status: IncidentStatus) => {
    switch (status) {
      case IncidentStatus.UNRESOLVED:
        return "bg-gray-100 text-gray-800";
      case IncidentStatus.IN_PROGRESS:
        return "bg-blue-100 text-blue-800";
      case IncidentStatus.RESOLVED:
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
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

  const handleViewDetails = (incident: Incident) => {
    toast({
      title: "View Incident Details",
      description: `Loading details for incident "${incident.title}"...`,
    });
    
    // In a real app, this would navigate to a detailed incident page
  };

  const handleResolveIncident = (incident: Incident) => {
    setSelectedIncident(incident);
    setIsResolveModalOpen(true);
  };

  const handleSubmitResolution = async (id: number, notes: string) => {
    try {
      await updateIncident(id, {
        status: IncidentStatus.RESOLVED,
        resolvedAt: new Date().toISOString(),
      });
      
      toast({
        title: "Incident Resolved",
        description: "The incident has been marked as resolved.",
      });
      
      refetchIncidents();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update incident status.",
        variant: "destructive",
      });
    }
  };

  const handleStartInvestigation = async (incident: Incident) => {
    try {
      await updateIncident(incident.id, {
        status: IncidentStatus.IN_PROGRESS,
      });
      
      toast({
        title: "Investigation Started",
        description: "The incident has been marked as in progress.",
      });
      
      refetchIncidents();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update incident status.",
        variant: "destructive",
      });
    }
  };

  const handleGenerateReport = (incident: Incident) => {
    toast({
      title: "Generating Report",
      description: `Creating incident report for "${incident.title}"...`,
    });
    
    // In a real app, this would trigger report generation
    setTimeout(() => {
      toast({
        title: "Report Generated",
        description: "The incident report is ready to download.",
      });
    }, 1500);
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
        <h2 className="text-xl font-semibold mb-2">Failed to load incidents</h2>
        <p className="text-gray-400 mb-4">
          There was an error loading the incident data.
        </p>
        <Button
          onClick={() => refetchIncidents()}
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
        <h1 className="text-2xl font-semibold">Security Incidents</h1>

        <div className="flex space-x-3">
          <Button
            className="bg-dark-lighter hover:bg-dark-light text-gray-200 px-4 py-2 rounded-md flex items-center space-x-2"
            onClick={() => refetchIncidents()}
          >
            <i className="fas fa-sync-alt"></i>
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      <Card className="bg-dark-lighter border-dark-light">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row justify-between mb-4">
            <CardTitle>Incident Management</CardTitle>
            <div className="flex flex-col md:flex-row gap-4 mt-4 md:mt-0">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search incidents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-dark border-dark-light pl-8 w-full"
                />
                <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
              </div>
              <div className="flex space-x-2">
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger className="bg-dark border-dark-light w-36">
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent className="bg-dark-lighter border-dark-light">
                    <SelectItem value="all">All Severities</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <Tabs defaultValue="all" onValueChange={setStatusFilter}>
            <TabsList className="bg-dark border-dark-light">
              <TabsTrigger value="all">All Incidents</TabsTrigger>
              <TabsTrigger value="unresolved">Unresolved</TabsTrigger>
              <TabsTrigger value="in-progress">In Progress</TabsTrigger>
              <TabsTrigger value="resolved">Resolved</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {filteredIncidents.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <i className="fas fa-shield-alt text-5xl mb-4"></i>
              <p>No incidents found with the selected filters</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredIncidents.map(incident => (
                <Card key={incident.id} className="bg-dark border-dark-light overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row">
                      <div className={`${getSeverityColor(incident.severity as IncidentSeverity)} p-6 flex items-center justify-center md:w-16`}>
                        <i className={`fas ${getIncidentIcon(incident.type)} text-2xl`}></i>
                      </div>
                      <div className="p-4 flex-1">
                        <div className="flex flex-col md:flex-row md:items-center justify-between mb-2">
                          <div>
                            <h3 className="text-lg font-medium">{incident.title}</h3>
                            <p className="text-sm text-gray-400">
                              {getClientName(incident.clientId)} • Reported on {formatDate(incident.reportedAt)}
                            </p>
                          </div>
                          <div className="flex space-x-2 mt-2 md:mt-0">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              incident.severity === "high" 
                                ? "bg-red-100 text-red-800" 
                                : incident.severity === "medium" 
                                ? "bg-amber-100 text-amber-800" 
                                : "bg-green-100 text-green-800"
                            }`}>
                              {incident.severity.charAt(0).toUpperCase() + incident.severity.slice(1)} Severity
                            </span>
                            <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(incident.status as IncidentStatus)}`}>
                              {incident.status === "unresolved" 
                                ? "Unresolved" 
                                : incident.status === "in-progress" 
                                ? "In Progress" 
                                : "Resolved"}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-300 mb-4 line-clamp-2">
                          {incident.description}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-dark-light text-gray-300 hover:bg-dark"
                            onClick={() => handleViewDetails(incident)}
                          >
                            <i className="fas fa-eye mr-2"></i>
                            View Details
                          </Button>
                          
                          {incident.status === IncidentStatus.UNRESOLVED && (
                            <Button
                              size="sm"
                              className="bg-blue-600 text-white hover:bg-blue-700"
                              onClick={() => handleStartInvestigation(incident)}
                            >
                              <i className="fas fa-play-circle mr-2"></i>
                              Start Investigation
                            </Button>
                          )}
                          
                          {incident.status === IncidentStatus.IN_PROGRESS && (
                            <Button
                              size="sm"
                              className="bg-green-600 text-white hover:bg-green-700"
                              onClick={() => handleResolveIncident(incident)}
                            >
                              <i className="fas fa-check-circle mr-2"></i>
                              Mark as Resolved
                            </Button>
                          )}
                          
                          {incident.status === IncidentStatus.RESOLVED && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-dark-light text-gray-300 hover:bg-dark"
                              onClick={() => handleGenerateReport(incident)}
                            >
                              <i className="fas fa-file-pdf mr-2"></i>
                              Generate Report
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ResolveIncidentModal
        isOpen={isResolveModalOpen}
        onClose={() => setIsResolveModalOpen(false)}
        incident={selectedIncident}
        onResolve={handleSubmitResolution}
      />
    </>
  );
}
