import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useClients } from "@/hooks/useClients";
import { useToast } from "@/hooks/use-toast";
import { RiskLevel } from "@/lib/types";

// Gebruik dezelfde stijl als op SettingsPage voor consistentie
const INPUT_STYLES = "bg-white border-dark-light text-black placeholder:text-gray-500";

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddClientModal({ isOpen, onClose }: AddClientModalProps) {
  const [name, setName] = useState("");
  const [clientId, setClientId] = useState("");
  const [riskLevel, setRiskLevel] = useState<RiskLevel>(RiskLevel.LOW);
  const { addClient, isAdding } = useClients();
  const { toast } = useToast();

  const generateClientId = () => {
    const prefix = "CYB-";
    const randomId = Math.floor(1000 + Math.random() * 9000);
    setClientId(`${prefix}${randomId}`);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Client name is required",
        variant: "destructive",
      });
      return;
    }

    if (!clientId.trim()) {
      toast({
        title: "Error",
        description: "Client ID is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const newClient = await addClient({
        name,
        clientId,
        riskLevel,
        status: "offline", // New clients start as offline until agent connects
      });
      
      toast({
        title: "Success",
        description: `Client ${name} has been added`,
        variant: "success",
      });
      
      // Send notification about new client
      try {
        await fetch('/api/notifications/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            type: 'security',
            title: 'New Client Added',
            message: `${name} (${clientId}) has been added to your client list with ${riskLevel} risk level.`,
            clientId: newClient.id
          })
        });
      } catch (error) {
        console.error("Failed to send notification", error);
      }
      
      // Reset form and close modal
      setName("");
      setClientId("");
      setRiskLevel(RiskLevel.LOW);
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add client. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-dark-lighter text-gray-100 border-dark-light max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Add New Client</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Client Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter client name"
              className={INPUT_STYLES}
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="clientId">Client ID</Label>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-primary hover:text-primary-foreground"
                onClick={generateClientId}
              >
                Generate ID
              </Button>
            </div>
            <Input
              id="clientId"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="e.g., CYB-1234"
              className={INPUT_STYLES}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="riskLevel">Initial Risk Level</Label>
            <Select 
              value={riskLevel} 
              onValueChange={(value) => setRiskLevel(value as RiskLevel)}
            >
              <SelectTrigger className={INPUT_STYLES}>
                <SelectValue placeholder="Select risk level" />
              </SelectTrigger>
              <SelectContent className="bg-dark-lighter border-dark-light text-gray-100">
                <SelectItem value={RiskLevel.LOW}>Low</SelectItem>
                <SelectItem value={RiskLevel.MEDIUM}>Medium</SelectItem>
                <SelectItem value={RiskLevel.HIGH}>High</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="pt-2">
            <p className="text-sm text-gray-400">
              After adding the client, you will need to install the CyberShieldX agent on the client's system.
            </p>
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
            disabled={isAdding}
            className="bg-primary text-white hover:bg-blue-600"
          >
            {isAdding ? (
              <>
                <span className="animate-spin mr-2">
                  <i className="fas fa-spinner"></i>
                </span>
                Adding...
              </>
            ) : (
              "Add Client"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
