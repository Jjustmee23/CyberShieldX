import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, KeyRound } from "lucide-react";

interface ChangePasswordModalProps {
  isOpen: boolean;
  isMandatory?: boolean;
  onClose: () => void;
  onPasswordChanged: (user: any) => void;
}

export default function ChangePasswordModal({ 
  isOpen, 
  isMandatory = false, 
  onClose, 
  onPasswordChanged 
}: ChangePasswordModalProps) {
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const resetForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setIsSubmitting(false);
  };
  
  const handleClose = () => {
    if (!isMandatory) {
      resetForm();
      onClose();
    }
  };
  
  const handleSubmit = async () => {
    // Validatie
    if (newPassword !== confirmPassword) {
      toast({
        title: "Wachtwoord komt niet overeen",
        description: "Nieuw wachtwoord en bevestiging komen niet overeen.",
        variant: "destructive",
      });
      return;
    }
    
    if (newPassword.length < 6) {
      toast({
        title: "Wachtwoord te kort",
        description: "Wachtwoord moet minstens 6 tekens bevatten.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        toast({
          title: "Fout bij bijwerken wachtwoord",
          description: data.message || "Er is een fout opgetreden bij het wijzigen van het wachtwoord.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }
      
      toast({
        title: "Wachtwoord bijgewerkt",
        description: "Uw wachtwoord is succesvol bijgewerkt.",
      });
      
      resetForm();
      if (data.user) {
        onPasswordChanged(data.user);
      }
    } catch (error) {
      toast({
        title: "Server Error",
        description: "Er is een serverfout opgetreden bij het bijwerken van uw wachtwoord.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-dark-lighter border-dark-light text-white">
        <DialogHeader>
          <div className="mx-auto bg-primary-dark p-3 rounded-full w-16 h-16 flex items-center justify-center mb-4">
            {isMandatory ? <KeyRound size={28} /> : <Shield size={28} />}
          </div>
          <DialogTitle className="text-center text-xl">
            {isMandatory ? "Wachtwoord wijzigen vereist" : "Wijzig uw wachtwoord"}
          </DialogTitle>
          <DialogDescription className="text-center text-gray-400">
            {isMandatory 
              ? "Je moet je wachtwoord wijzigen voordat je de applicatie kunt gebruiken." 
              : "Wijzig uw wachtwoord om de beveiliging van uw account te verhogen."}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Huidig Wachtwoord</Label>
            <Input 
              id="currentPassword" 
              type="password" 
              value={currentPassword} 
              onChange={(e) => setCurrentPassword(e.target.value)} 
              className="bg-dark border-dark-light text-white placeholder:text-gray-400"
              placeholder="Voer uw huidige wachtwoord in"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="newPassword">Nieuw Wachtwoord</Label>
            <Input 
              id="newPassword" 
              type="password" 
              value={newPassword} 
              onChange={(e) => setNewPassword(e.target.value)} 
              className="bg-dark border-dark-light text-white placeholder:text-gray-400"
              placeholder="Voer een nieuw wachtwoord in"
            />
            <p className="text-xs text-gray-400">Wachtwoord moet uit minstens 6 tekens bestaan</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Bevestig Nieuw Wachtwoord</Label>
            <Input 
              id="confirmPassword" 
              type="password" 
              value={confirmPassword} 
              onChange={(e) => setConfirmPassword(e.target.value)} 
              className="bg-dark border-dark-light text-white placeholder:text-gray-400"
              placeholder="Bevestig uw nieuwe wachtwoord"
            />
          </div>
        </div>
        
        <DialogFooter>
          {!isMandatory && (
            <Button variant="outline" onClick={handleClose} className="mr-2 border-dark-light">
              Annuleren
            </Button>
          )}
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !currentPassword || !newPassword || !confirmPassword}
            className="bg-primary text-white hover:bg-blue-600"
          >
            {isSubmitting ? "Wachtwoord wijzigen..." : "Wachtwoord wijzigen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}