import React, { useState } from 'react';
import { Button, type ButtonProps } from "@/components/ui/button";
import { RefreshCw, Check, AlertTriangle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';

interface UpdateAgentsButtonProps extends ButtonProps {}

/**
 * Button component to update all connected agents
 * Sends an update command to the server which forwards it to all online agents
 */
const UpdateAgentsButton: React.FC<UpdateAgentsButtonProps> = ({ className, ...props }) => {
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [progress, setProgress] = useState(0);

  const updateAgents = async () => {
    setIsUpdating(true);
    setProgress(0);
    
    try {
      // Send update command to server
      const response = await apiRequest({
        url: '/api/agents/update',
        method: 'POST'
      });
      
      if (response.success) {
        toast({
          title: 'Agents Update',
          description: `Update gestart voor ${response.agentCount} online agent(s).`,
          variant: 'default',
        });
        
        // If there are agents to update, start polling for progress
        if (response.agentCount > 0) {
          pollUpdateStatus();
        } else {
          setIsUpdating(false);
        }
      } else {
        if (response.inProgress) {
          toast({
            title: 'Update al bezig',
            description: 'Er is al een update bezig, wacht tot deze is voltooid.',
            variant: 'destructive',
          });
          pollUpdateStatus();
        } else {
          toast({
            title: 'Update mislukt',
            description: response.message || 'Er is een fout opgetreden bij het bijwerken van de agents.',
            variant: 'destructive',
          });
          setIsUpdating(false);
        }
      }
    } catch (error) {
      console.error('Error updating agents:', error);
      toast({
        title: 'Update mislukt',
        description: 'Er is een fout opgetreden bij het bijwerken van de agents.',
        variant: 'destructive',
      });
      setIsUpdating(false);
    }
  };
  
  const pollUpdateStatus = () => {
    // Set up polling interval to check update status
    const interval = setInterval(async () => {
      try {
        const status = await apiRequest({
          url: '/api/agents/update/status',
          method: 'GET'
        });
        
        if (status.inProgress) {
          // Update progress percentage
          setProgress(status.progress.percentage);
        } else {
          // Update completed
          setProgress(100);
          clearInterval(interval);
          
          setTimeout(() => {
            setIsUpdating(false);
            
            // Show completion toast
            toast({
              title: 'Update voltooid',
              description: `Alle agents zijn bijgewerkt naar de nieuwste versie.`,
              variant: 'default',
            });
            
            // Invalidate clients cache to refresh status
            queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
          }, 1000);
        }
      } catch (error) {
        console.error('Error checking update status:', error);
        clearInterval(interval);
        setIsUpdating(false);
        
        toast({
          title: 'Status controle mislukt',
          description: 'Er is een fout opgetreden bij het controleren van de update status.',
          variant: 'destructive',
        });
      }
    }, 2000); // Check every 2 seconds
    
    // Store interval ID to clean up
    return () => clearInterval(interval);
  };
  
  return (
    <Button
      variant="outline"
      onClick={updateAgents}
      disabled={isUpdating}
      className={`relative ${className}`}
      {...props}
    >
      {isUpdating ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          <span>Bijwerken {progress > 0 ? `(${progress}%)` : ''}</span>
          {/* Progress bar */}
          <div 
            className="absolute bottom-0 left-0 h-1 bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </>
      ) : (
        <>
          <RefreshCw className="mr-2 h-4 w-4" />
          <span>Agents bijwerken</span>
        </>
      )}
    </Button>
  );
};

export default UpdateAgentsButton;