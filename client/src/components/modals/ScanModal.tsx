import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Client, ScanType } from "@/lib/types";
import { useState } from "react";
import { useScans } from "@/hooks/useScans";
import { useToast } from "@/hooks/use-toast";

interface ScanModalProps {
  client: Client | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ScanModal({ client, isOpen, onClose }: ScanModalProps) {
  const [scanType, setScanType] = useState<ScanType>(ScanType.NETWORK);
  const [thorough, setThorough] = useState(true);
  const [generateReport, setGenerateReport] = useState(true);
  const [sendEmail, setSendEmail] = useState(false);
  const { startScan, isStarting } = useScans();
  const { toast } = useToast();

  if (!client) return null;

  const handleStartScan = async () => {
    try {
      const scan = await startScan({
        clientId: client.id,
        type: scanType,
        options: {
          thorough,
          reportOnCompletion: generateReport,
          sendEmailNotification: sendEmail,
        },
      });
      
      toast({
        title: "Scan started",
        description: `${scanType.charAt(0).toUpperCase() + scanType.slice(1)} scan started for ${client.name}`,
        variant: "success",
      });
      
      // Send notification to server
      if (sendEmail) {
        try {
          await fetch('/api/notifications/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              type: 'scan',
              title: `Scan Started: ${client.name}`,
              message: `A ${scanType} scan has been initiated for ${client.name}. You will be notified when it completes.`,
              clientId: client.id
            })
          });
        } catch (error) {
          console.error("Failed to send notification", error);
        }
      }
      
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start scan. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Get initials for client logo
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-dark-lighter text-gray-100 border-dark-light max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Start New Scan</DialogTitle>
        </DialogHeader>

        <div className="mb-4">
          <label className="block text-gray-300 text-sm font-medium mb-2">Client</label>
          <div className="flex items-center p-3 bg-dark rounded-md border border-dark-light">
            <div
              className={`w-8 h-8 ${getClientColor(
                client.name
              )} rounded-md flex items-center justify-center font-semibold`}
            >
              {getInitials(client.name)}
            </div>
            <span className="ml-3 text-gray-200">{client.name}</span>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-gray-300 text-sm font-medium mb-2">Scan Type</label>
          <div className="grid grid-cols-2 gap-3">
            <div
              className={`border ${
                scanType === ScanType.NETWORK ? "border-primary bg-primary bg-opacity-10" : "border-dark-light"
              } rounded-md p-3 cursor-pointer hover:border-primary hover:bg-primary hover:bg-opacity-5`}
              onClick={() => setScanType(ScanType.NETWORK)}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <i className={`fas fa-network-wired ${scanType === ScanType.NETWORK ? "text-primary" : "text-gray-400"}`}></i>
                  <span className="text-sm ml-2 font-medium">Network Scan</span>
                </div>
                <div
                  className={`w-4 h-4 rounded-full border-2 ${
                    scanType === ScanType.NETWORK ? "border-primary" : "border-gray-400"
                  } flex items-center justify-center`}
                >
                  {scanType === ScanType.NETWORK && <div className="w-2 h-2 rounded-full bg-primary"></div>}
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2">Scans network devices, open ports and services</p>
            </div>

            <div
              className={`border ${
                scanType === ScanType.SYSTEM ? "border-primary bg-primary bg-opacity-10" : "border-dark-light"
              } rounded-md p-3 cursor-pointer hover:border-primary hover:bg-primary hover:bg-opacity-5`}
              onClick={() => setScanType(ScanType.SYSTEM)}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <i className={`fas fa-laptop ${scanType === ScanType.SYSTEM ? "text-primary" : "text-gray-400"}`}></i>
                  <span className="text-sm ml-2 font-medium">System Scan</span>
                </div>
                <div
                  className={`w-4 h-4 rounded-full border-2 ${
                    scanType === ScanType.SYSTEM ? "border-primary" : "border-gray-400"
                  } flex items-center justify-center`}
                >
                  {scanType === ScanType.SYSTEM && <div className="w-2 h-2 rounded-full bg-primary"></div>}
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2">Analyzes system configuration and security settings</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-3">
            <div
              className={`border ${
                scanType === ScanType.WEBAPP ? "border-primary bg-primary bg-opacity-10" : "border-dark-light"
              } rounded-md p-3 cursor-pointer hover:border-primary hover:bg-primary hover:bg-opacity-5`}
              onClick={() => setScanType(ScanType.WEBAPP)}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <i className={`fas fa-globe ${scanType === ScanType.WEBAPP ? "text-primary" : "text-gray-400"}`}></i>
                  <span className="text-sm ml-2 font-medium">Web Scan</span>
                </div>
                <div
                  className={`w-4 h-4 rounded-full border-2 ${
                    scanType === ScanType.WEBAPP ? "border-primary" : "border-gray-400"
                  } flex items-center justify-center`}
                >
                  {scanType === ScanType.WEBAPP && <div className="w-2 h-2 rounded-full bg-primary"></div>}
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2">Tests web applications for vulnerabilities</p>
            </div>

            <div
              className={`border ${
                scanType === ScanType.FULL ? "border-primary bg-primary bg-opacity-10" : "border-dark-light"
              } rounded-md p-3 cursor-pointer hover:border-primary hover:bg-primary hover:bg-opacity-5`}
              onClick={() => setScanType(ScanType.FULL)}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <i className={`fas fa-shield-alt ${scanType === ScanType.FULL ? "text-primary" : "text-gray-400"}`}></i>
                  <span className="text-sm ml-2 font-medium">Full Scan</span>
                </div>
                <div
                  className={`w-4 h-4 rounded-full border-2 ${
                    scanType === ScanType.FULL ? "border-primary" : "border-gray-400"
                  } flex items-center justify-center`}
                >
                  {scanType === ScanType.FULL && <div className="w-2 h-2 rounded-full bg-primary"></div>}
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2">Comprehensive security assessment</p>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-gray-300 text-sm font-medium mb-2">Scan Options</label>
          <div className="space-y-2">
            <div className="flex items-center">
              <Checkbox
                id="thorough"
                checked={thorough}
                onCheckedChange={(checked) => setThorough(checked === true)}
                className="border-gray-600 text-primary focus:ring-primary"
              />
              <label htmlFor="thorough" className="ml-2 text-sm text-gray-300">
                Thorough scan (takes longer)
              </label>
            </div>
            <div className="flex items-center">
              <Checkbox
                id="report"
                checked={generateReport}
                onCheckedChange={(checked) => setGenerateReport(checked === true)}
                className="border-gray-600 text-primary focus:ring-primary"
              />
              <label htmlFor="report" className="ml-2 text-sm text-gray-300">
                Generate report after completion
              </label>
            </div>
            <div className="flex items-center">
              <Checkbox
                id="notify"
                checked={sendEmail}
                onCheckedChange={(checked) => setSendEmail(checked === true)}
                className="border-gray-600 text-primary focus:ring-primary"
              />
              <label htmlFor="notify" className="ml-2 text-sm text-gray-300">
                Send email notification when complete
              </label>
            </div>
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
            onClick={handleStartScan}
            disabled={isStarting}
            className="bg-primary text-white hover:bg-blue-600"
          >
            {isStarting ? (
              <>
                <span className="animate-spin mr-2">
                  <i className="fas fa-spinner"></i>
                </span>
                Starting...
              </>
            ) : (
              "Start Scan"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
