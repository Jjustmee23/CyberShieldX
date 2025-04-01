import { useState } from "react";
import { Client, RiskLevel } from "@/lib/types";
import { useLocation } from "wouter";

interface ClientsTableProps {
  clients: Client[];
  onViewDetails: (client: Client) => void;
  onStartScan: (client: Client) => void;
  onGenerateReport: (client: Client) => void;
}

export default function ClientsTable({
  clients,
  onViewDetails,
  onStartScan,
  onGenerateReport,
}: ClientsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Filter and paginate clients
  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const currentClients = filteredClients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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
      case "low":
        return {
          barColor: "bg-green-500",
          width: "25%",
          textColor: "text-green-500",
        };
      case "medium":
        return {
          barColor: "bg-amber-500",
          width: "65%",
          textColor: "text-amber-500",
        };
      case "high":
        return {
          barColor: "bg-red-500",
          width: "90%",
          textColor: "text-red-500",
        };
      default:
        return {
          barColor: "bg-gray-500",
          width: "0%",
          textColor: "text-gray-500",
        };
    }
  };

  return (
    <div className="bg-dark-lighter rounded-lg shadow">
      <div className="flex items-center justify-between p-4 border-b border-dark-light">
        <h2 className="text-lg font-semibold">Clients Overview</h2>
        <div className="flex space-x-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Search clients..."
              className="bg-dark rounded-md pl-8 pr-3 py-1.5 text-sm placeholder-gray-400 border border-dark-light focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <i className="fas fa-search absolute left-2.5 top-2.5 text-gray-400"></i>
          </div>
          <button className="bg-dark hover:bg-dark-light text-gray-200 p-1.5 rounded-md">
            <i className="fas fa-filter"></i>
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-dark-light">
          <thead>
            <tr>
              <th className="p-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Client
              </th>
              <th className="p-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="p-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Last Scan
              </th>
              <th className="p-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Risk Level
              </th>
              <th className="p-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-light">
            {currentClients.map((client) => {
              const riskUI = getRiskLevelUI(client.riskLevel);
              
              return (
                <tr key={client.id} className="hover:bg-dark-light transition-colors">
                  <td className="p-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div
                        className={`w-8 h-8 ${getClientColor(
                          client.name
                        )} rounded-md flex items-center justify-center font-semibold`}
                      >
                        {getInitials(client.name)}
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium">{client.name}</p>
                        <p className="text-xs text-gray-400">
                          ID: {client.clientId}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        client.status === "online"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {client.status === "online" ? "Online" : "Offline"}
                    </span>
                  </td>
                  <td className="p-4 whitespace-nowrap text-sm">
                    <div className="text-gray-300">
                      {new Date(client.lastSeen).toLocaleString('en-US', {
                        hour: 'numeric',
                        minute: 'numeric',
                        hour12: true,
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                    <div className="text-xs text-gray-400">Network scan</div>
                  </td>
                  <td className="p-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-16 h-2 bg-dark rounded overflow-hidden">
                        <div
                          className={`${riskUI.barColor} h-full`}
                          style={{ width: riskUI.width }}
                        ></div>
                      </div>
                      <span className={`ml-2 text-xs ${riskUI.textColor}`}>
                        {client.riskLevel.charAt(0).toUpperCase() +
                          client.riskLevel.slice(1)}
                      </span>
                    </div>
                  </td>
                  <td className="p-4 whitespace-nowrap text-sm">
                    <div className="flex space-x-2">
                      <button
                        className="text-gray-400 hover:text-gray-100"
                        onClick={() => onViewDetails(client)}
                      >
                        <i className="fas fa-eye"></i>
                      </button>
                      <button
                        className="text-gray-400 hover:text-gray-100"
                        onClick={() => onStartScan(client)}
                      >
                        <i className="fas fa-search"></i>
                      </button>
                      <button
                        className="text-gray-400 hover:text-gray-100"
                        onClick={() => onGenerateReport(client)}
                      >
                        <i className="fas fa-file-pdf"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="p-4 border-t border-dark-light flex items-center justify-between">
        <div className="text-sm text-gray-400">
          Showing {Math.min(filteredClients.length, itemsPerPage)} of{" "}
          {filteredClients.length} clients
        </div>
        <div className="flex space-x-1">
          <button
            className={`px-3 py-1 ${
              currentPage === 1
                ? "bg-dark text-gray-400"
                : "bg-dark hover:bg-dark-light text-gray-400"
            } rounded-md`}
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          
          {[...Array(totalPages)].map((_, i) => (
            <button
              key={i}
              className={`px-3 py-1 ${
                currentPage === i + 1
                  ? "bg-primary text-white"
                  : "bg-dark hover:bg-dark-light text-gray-400"
              } rounded-md`}
              onClick={() => setCurrentPage(i + 1)}
            >
              {i + 1}
            </button>
          ))}
          
          <button
            className={`px-3 py-1 ${
              currentPage === totalPages
                ? "bg-dark text-gray-400"
                : "bg-dark hover:bg-dark-light text-gray-400"
            } rounded-md`}
            onClick={() =>
              setCurrentPage(Math.min(totalPages, currentPage + 1))
            }
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
