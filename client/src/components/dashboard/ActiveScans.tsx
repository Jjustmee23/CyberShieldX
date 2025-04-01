import { Card } from "@/components/ui/card";
import { Scan } from "@/lib/types";

interface ActiveScansProps {
  scans: Scan[];
}

export default function ActiveScans({ scans }: ActiveScansProps) {
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

  // Format time
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Estimate completion time (15-30 min after start)
  const estimateCompletion = (startDate: Date) => {
    const estimatedMinutes = 15 + Math.floor(Math.random() * 15);
    const completionDate = new Date(startDate);
    completionDate.setMinutes(completionDate.getMinutes() + estimatedMinutes);
    return formatTime(completionDate);
  };

  return (
    <Card className="bg-dark-lighter rounded-lg shadow">
      <div className="p-4 border-b border-dark-light">
        <h2 className="text-lg font-semibold">Active Scans</h2>
      </div>
      <div className="p-4 space-y-4">
        {scans.length === 0 ? (
          <div className="text-center py-4 text-gray-400">
            <i className="fas fa-search-minus text-3xl mb-2"></i>
            <p>No active scans</p>
          </div>
        ) : (
          scans.map((scan) => (
            <div key={scan.id} className="border border-dark-light rounded-md p-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center">
                    <div
                      className={`w-6 h-6 ${getClientColor(
                        scan.client?.name || ""
                      )} rounded flex items-center justify-center text-xs font-semibold`}
                    >
                      {getInitials(scan.client?.name || "")}
                    </div>
                    <h3 className="text-sm font-medium ml-2">
                      {scan.client?.name || "Unknown Client"}
                    </h3>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {scan.type} scan in progress
                  </p>
                </div>
                <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800">
                  {scan.progress}%
                </span>
              </div>
              <div className="mt-3">
                <div className="w-full h-1.5 bg-dark rounded-full overflow-hidden">
                  <div
                    className="bg-blue-500 h-full"
                    style={{ width: `${scan.progress}%` }}
                  ></div>
                </div>
              </div>
              <div className="mt-3 text-xs text-gray-400">
                Started {formatTime(new Date(scan.startedAt))} • Est. completion:{" "}
                {estimateCompletion(new Date(scan.startedAt))}
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
