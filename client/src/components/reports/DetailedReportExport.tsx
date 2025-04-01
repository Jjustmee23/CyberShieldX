import React, { useState } from 'react';
import { saveAs } from 'file-saver';
import { Button } from "@/components/ui/button";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { Download, FileText, FileCode } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Report } from '@shared/schema';
import { apiRequest } from '@/lib/api';

interface DetailedReportExportProps {
  report: Report;
  clientName: string;
}

const DetailedReportExport: React.FC<DetailedReportExportProps> = ({ report, clientName }) => {
  const [exportType, setExportType] = useState<'pdf' | 'html' | 'json'>('pdf');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Get report data
      const response = await apiRequest(`/api/reports/${report.id}/export?format=${exportType}`, {
        method: 'GET'
      });

      // Create file name based on report type and date
      const date = report.createdAt ? new Date(report.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      const sanitizedClientName = clientName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      
      let fileName = `CyberShieldX_${sanitizedClientName}_${report.type}_report_${date}`;
      let mimeType = '';
      let content: Blob;
      
      // Process the response based on export type
      if (exportType === 'html' && typeof response === 'string') {
        content = new Blob([response], { type: 'text/html' });
        mimeType = 'text/html';
        fileName += '.html';
      } else if (exportType === 'json') {
        content = new Blob([JSON.stringify(response, null, 2)], { type: 'application/json' });
        mimeType = 'application/json';
        fileName += '.json';
      } else {
        // For PDF or fallback
        const jsonStr = JSON.stringify(response, null, 2);
        content = new Blob([jsonStr], { type: 'application/json' });
        mimeType = 'application/json';
        fileName += '.json';
      }
      
      // Download the file
      saveAs(content, fileName);
      
      toast({
        title: "Export Successful",
        description: `Report exported as ${exportType.toUpperCase()}`,
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: "Export Failed",
        description: "There was an error exporting the report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
      setIsDialogOpen(false);
    }
  };

  return (
    <>
      <Button onClick={() => setIsDialogOpen(true)} variant="outline">
        <Download className="mr-2 h-4 w-4" />
        Export Report
      </Button>
      
      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Export Detailed Security Report</AlertDialogTitle>
            <AlertDialogDescription>
              Choose your preferred format for the detailed report. The report includes all scan results, 
              identified issues, and a comprehensive remediation plan with step-by-step instructions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="grid grid-cols-3 gap-4 py-4">
            <div 
              className={`flex flex-col items-center border rounded-md p-4 cursor-pointer transition-colors ${exportType === 'pdf' ? 'border-primary bg-primary/10' : 'hover:bg-muted'}`}
              onClick={() => setExportType('pdf')}
            >
              <FileText size={24} className={exportType === 'pdf' ? 'text-primary' : ''} />
              <span className="mt-2 font-medium">PDF</span>
              <span className="text-xs text-muted-foreground text-center mt-1">Complete report with formatting</span>
            </div>
            
            <div 
              className={`flex flex-col items-center border rounded-md p-4 cursor-pointer transition-colors ${exportType === 'html' ? 'border-primary bg-primary/10' : 'hover:bg-muted'}`}
              onClick={() => setExportType('html')}
            >
              <FileCode size={24} className={exportType === 'html' ? 'text-primary' : ''} />
              <span className="mt-2 font-medium">HTML</span>
              <span className="text-xs text-muted-foreground text-center mt-1">Interactive web-based report</span>
            </div>
            
            <div 
              className={`flex flex-col items-center border rounded-md p-4 cursor-pointer transition-colors ${exportType === 'json' ? 'border-primary bg-primary/10' : 'hover:bg-muted'}`}
              onClick={() => setExportType('json')}
            >
              <FileCode size={24} className={exportType === 'json' ? 'text-primary' : ''} />
              <span className="mt-2 font-medium">JSON</span>
              <span className="text-xs text-muted-foreground text-center mt-1">Machine-readable format</span>
            </div>
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isExporting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e: React.MouseEvent) => {
                e.preventDefault();
                handleExport();
              }}
              disabled={isExporting}
            >
              {isExporting ? 'Exporting...' : 'Export Report'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default DetailedReportExport;