import { Card } from "@/components/ui/card";
import { Incident } from "@/lib/types";
import { useLocation } from "wouter";

interface RecentIncidentsProps {
  incidents: Incident[];
}

export default function RecentIncidents({ incidents }: RecentIncidentsProps) {
  const [, navigate] = useLocation();

  // Get icon for incident type
  const getIncidentIcon = (type: string) => {
    switch (type) {
      case "suspicious-login":
        return "fas fa-exclamation-triangle";
      case "malware":
        return "fas fa-virus";
      case "firewall":
        return "fas fa-shield-alt";
      case "vulnerability":
        return "fas fa-bug";
      case "phishing":
        return "fas fa-user-secret";
      default:
        return "fas fa-exclamation-circle";
    }
  };

  // Get background color for incident severity
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-100 text-red-600";
      case "medium":
        return "bg-amber-100 text-amber-600";
      case "low":
        return "bg-green-100 text-green-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  // Get status badge color
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "unresolved":
        return "bg-gray-100 text-gray-800";
      case "in-progress":
        return "bg-gray-100 text-gray-800";
      case "resolved":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Format time
  const formatTime = (date: Date) => {
    // If today, show time, otherwise show date
    const today = new Date();
    const incidentDate = new Date(date);
    
    if (today.toDateString() === incidentDate.toDateString()) {
      return `Today, ${incidentDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })}`;
    } else {
      return `Yesterday, ${incidentDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })}`;
    }
  };

  return (
    <Card className="bg-dark-lighter rounded-lg shadow">
      <div className="p-4 border-b border-dark-light">
        <h2 className="text-lg font-semibold">Recent Security Incidents</h2>
      </div>
      <div className="p-4">
        {incidents.length === 0 ? (
          <div className="text-center py-4 text-gray-400">
            <i className="fas fa-shield-alt text-3xl mb-2"></i>
            <p>No recent security incidents</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {incidents.map((incident) => (
              <li key={incident.id} className="flex items-start space-x-3">
                <div
                  className={`flex-shrink-0 w-8 h-8 ${getSeverityColor(
                    incident.severity
                  )} rounded-full flex items-center justify-center`}
                >
                  <i className={getIncidentIcon(incident.type)}></i>
                </div>
                <div>
                  <p className="text-sm font-medium">{incident.title}</p>
                  <p className="text-xs text-gray-400">
                    {incident.client?.name || "Unknown Client"} •{" "}
                    {formatTime(new Date(incident.reportedAt))}
                  </p>
                  <div className="mt-1 flex space-x-2">
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full ${
                        incident.severity === "high"
                          ? "bg-red-100 text-red-800"
                          : incident.severity === "medium"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {incident.severity.charAt(0).toUpperCase() +
                        incident.severity.slice(1)}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full ${getStatusBadge(
                        incident.status
                      )}`}
                    >
                      {incident.status === "unresolved"
                        ? "Unresolved"
                        : incident.status === "in-progress"
                        ? "In Progress"
                        : "Resolved"}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        {incidents.length > 0 && (
          <div className="mt-4 text-center">
            <button
              className="text-primary hover:text-blue-600 text-sm font-medium"
              onClick={() => navigate("/incidents")}
            >
              View All Incidents
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}
