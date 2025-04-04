import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function FirstSetupPage() {
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const [_, setLocation] = useLocation();

  // Database setup
  const [dbHost, setDbHost] = useState("localhost");
  const [dbPort, setDbPort] = useState("5432");
  const [dbName, setDbName] = useState("cybershieldx");
  const [dbUser, setDbUser] = useState("postgres");
  const [dbPassword, setDbPassword] = useState("");

  // Admin user setup
  const [adminUsername, setAdminUsername] = useState("admin");
  const [adminPassword, setAdminPassword] = useState("password123");
  const [adminName, setAdminName] = useState("Admin User");
  const [adminEmail, setAdminEmail] = useState("admin@cybershieldx.com");

  const handleDatabaseSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!dbHost || !dbPort || !dbName || !dbUser) {
      toast({
        title: "Error",
        description: "All database fields are required",
        variant: "destructive",
      });
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const response = await fetch('/api/setup/database', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host: dbHost,
          port: parseInt(dbPort),
          database: dbName,
          user: dbUser,
          password: dbPassword
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to setup database');
      }
      
      toast({
        title: "Success",
        description: "Database configured successfully!",
      });
      
      setStep(2);
    } catch (error) {
      toast({
        title: "Database Setup Error",
        description: error instanceof Error ? error.message : "Failed to setup database",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAdminSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!adminUsername || !adminPassword || !adminName || !adminEmail) {
      toast({
        title: "Error",
        description: "All admin user fields are required",
        variant: "destructive",
      });
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const response = await fetch('/api/setup/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: adminUsername,
          password: adminPassword,
          name: adminName,
          email: adminEmail
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create admin user');
      }
      
      toast({
        title: "Success",
        description: "Initial setup completed! Redirecting to login...",
      });
      
      // Redirect to login page after successful setup
      setTimeout(() => {
        setLocation('/login');
      }, 2000);
    } catch (error) {
      toast({
        title: "Admin Setup Error",
        description: error instanceof Error ? error.message : "Failed to create admin user",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-b from-blue-900 to-black">
      <div className="m-auto w-full max-w-md p-4">
        <Card className="bg-dark-lighter border-dark-light">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">CyberShieldX Setup</CardTitle>
            <CardDescription className="text-center text-gray-400">
              {step === 1 
                ? "Configure your database connection" 
                : "Create your admin user account"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 1 ? (
              <form onSubmit={handleDatabaseSetup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="dbHost">Database Host</Label>
                  <Input
                    id="dbHost"
                    placeholder="localhost"
                    value={dbHost}
                    onChange={(e) => setDbHost(e.target.value)}
                    className="bg-dark border-dark-light text-white placeholder:text-gray-400"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="dbPort">Database Port</Label>
                  <Input
                    id="dbPort"
                    placeholder="5432"
                    value={dbPort}
                    onChange={(e) => setDbPort(e.target.value)}
                    className="bg-dark border-dark-light text-white placeholder:text-gray-400"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="dbName">Database Name</Label>
                  <Input
                    id="dbName"
                    placeholder="cybershieldx"
                    value={dbName}
                    onChange={(e) => setDbName(e.target.value)}
                    className="bg-dark border-dark-light text-white placeholder:text-gray-400"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="dbUser">Database User</Label>
                  <Input
                    id="dbUser"
                    placeholder="postgres"
                    value={dbUser}
                    onChange={(e) => setDbUser(e.target.value)}
                    className="bg-dark border-dark-light text-white placeholder:text-gray-400"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="dbPassword">Database Password</Label>
                  <Input
                    id="dbPassword"
                    type="password"
                    placeholder="Enter database password"
                    value={dbPassword}
                    onChange={(e) => setDbPassword(e.target.value)}
                    className="bg-dark border-dark-light text-white placeholder:text-gray-400"
                  />
                </div>
                
                <Button
                  type="submit"
                  className="w-full mt-4 bg-primary text-white hover:bg-blue-600"
                  disabled={isProcessing}
                >
                  {isProcessing ? "Configuring Database..." : "Next"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleAdminSetup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="adminUsername">Admin Username</Label>
                  <Input
                    id="adminUsername"
                    placeholder="admin"
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    className="bg-dark border-dark-light text-white placeholder:text-gray-400"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="adminPassword">Admin Password</Label>
                  <Input
                    id="adminPassword"
                    type="password"
                    placeholder="password123"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="bg-dark border-dark-light text-white placeholder:text-gray-400"
                  />
                  <p className="text-xs text-gray-400">
                    You will need to change this after first login
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="adminName">Admin Name</Label>
                  <Input
                    id="adminName"
                    placeholder="Admin User"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    className="bg-dark border-dark-light text-white placeholder:text-gray-400"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="adminEmail">Admin Email</Label>
                  <Input
                    id="adminEmail"
                    type="email"
                    placeholder="admin@cybershieldx.com"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="bg-dark border-dark-light text-white placeholder:text-gray-400"
                  />
                </div>
                
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 border-dark-light text-gray-300 hover:bg-dark-light"
                    onClick={() => setStep(1)}
                    disabled={isProcessing}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-primary text-white hover:bg-blue-600"
                    disabled={isProcessing}
                  >
                    {isProcessing ? "Setting Up..." : "Complete Setup"}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}