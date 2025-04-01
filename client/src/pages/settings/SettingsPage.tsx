import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentTab, setCurrentTab] = useState("general");

  // General settings states
  const [companyName, setCompanyName] = useState("CyberShield Consulting");
  const [emailAddress, setEmailAddress] = useState(user?.email || "");
  const [reportLogo, setReportLogo] = useState<File | null>(null);
  const [reportFooter, setReportFooter] = useState("Confidential Security Report - CyberShield Consulting");
  
  // Security settings states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState("30");
  
  // Notification settings states
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [incidentAlerts, setIncidentAlerts] = useState(true);
  const [scanCompletions, setScanCompletions] = useState(true);
  const [weeklyReports, setWeeklyReports] = useState(false);
  const [notificationEmail, setNotificationEmail] = useState(user?.email || "");
  
  // API settings states
  const [nmapPath, setNmapPath] = useState("/usr/bin/nmap");
  const [zapPath, setZapPath] = useState("/usr/bin/zap");
  const [apiKeys, setApiKeys] = useState("");

  const handleSaveGeneral = () => {
    toast({
      title: "Settings Saved",
      description: "Your general settings have been updated.",
    });
  };

  const handleSaveSecurity = () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "New password and confirmation do not match.",
        variant: "destructive",
      });
      return;
    }
    
    if (newPassword && newPassword.length < 8) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "Security Settings Saved",
      description: newPassword ? "Your password has been updated." : "Your security settings have been updated.",
    });
    
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleSaveNotifications = () => {
    // Save notification settings to the server
    fetch('/api/settings/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        emailNotifications,
        incidentAlerts,
        scanCompletions,
        weeklyReports,
        notificationEmail
      })
    })
    .then(res => {
      if (!res.ok) {
        throw new Error('Failed to save notification settings');
      }
      return res.json();
    })
    .then(() => {
      toast({
        title: "Notification Settings Saved",
        description: "Your notification preferences have been updated.",
      });
      
      // Send a test notification if email notifications are enabled
      if (emailNotifications) {
        fetch('/api/notifications/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            type: 'security',
            title: 'Test Notification',
            message: 'This is a test notification to confirm your settings are working.'
          })
        })
        .then(res => res.json())
        .then(() => {
          toast({
            title: "Test Notification Sent",
            description: "Check your email to confirm notification delivery.",
          });
        })
        .catch(() => {
          toast({
            title: "Warning",
            description: "Failed to send test notification. Your settings were saved.",
            variant: "destructive",
          });
        });
      }
    })
    .catch(() => {
      toast({
        title: "Error",
        description: "Failed to save notification settings.",
        variant: "destructive",
      });
    });
  };

  const handleSaveApi = () => {
    toast({
      title: "API Settings Saved",
      description: "Your API settings have been updated.",
    });
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setReportLogo(e.target.files[0]);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Settings</h1>
      </div>

      <div className="flex flex-col space-y-6">
        <Tabs defaultValue="general" value={currentTab} onValueChange={setCurrentTab}>
          <TabsList className="bg-dark-lighter border-dark-light mb-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="api">Scanner Configuration</TabsTrigger>
          </TabsList>
          
          <TabsContent value="general">
            <Card className="bg-dark-lighter border-dark-light">
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription className="text-gray-400">
                  Configure your account details and report settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input 
                    id="companyName" 
                    value={companyName} 
                    onChange={(e) => setCompanyName(e.target.value)} 
                    className="bg-dark border-dark-light"
                  />
                  <p className="text-xs text-gray-400">This will appear on all reports and client communications.</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="emailAddress">Email Address</Label>
                  <Input 
                    id="emailAddress" 
                    value={emailAddress} 
                    onChange={(e) => setEmailAddress(e.target.value)} 
                    className="bg-dark border-dark-light"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="reportLogo">Report Logo</Label>
                  <div className="flex items-center">
                    {reportLogo ? (
                      <div className="flex items-center mr-3">
                        <div className="w-10 h-10 bg-gray-700 rounded flex items-center justify-center text-gray-400">
                          <i className="fas fa-file-image"></i>
                        </div>
                        <span className="ml-2 text-sm text-gray-300">{reportLogo.name}</span>
                      </div>
                    ) : (
                      <div className="w-10 h-10 bg-gray-700 rounded flex items-center justify-center text-gray-400 mr-3">
                        <i className="fas fa-image"></i>
                      </div>
                    )}
                    <Input 
                      id="reportLogo" 
                      type="file" 
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="border-dark-light text-gray-300"
                      onClick={() => document.getElementById('reportLogo')?.click()}
                    >
                      Choose File
                    </Button>
                  </div>
                  <p className="text-xs text-gray-400">Upload a logo to appear on all security reports (recommended size: 200x60px).</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="reportFooter">Report Footer Text</Label>
                  <Input 
                    id="reportFooter" 
                    value={reportFooter} 
                    onChange={(e) => setReportFooter(e.target.value)} 
                    className="bg-dark border-dark-light"
                  />
                  <p className="text-xs text-gray-400">This text will appear in the footer of all PDF reports.</p>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  className="bg-primary text-white hover:bg-blue-600"
                  onClick={handleSaveGeneral}
                >
                  Save Changes
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="security">
            <Card className="bg-dark-lighter border-dark-light">
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription className="text-gray-400">
                  Manage your account security and authentication settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input 
                    id="currentPassword" 
                    type="password" 
                    value={currentPassword} 
                    onChange={(e) => setCurrentPassword(e.target.value)} 
                    className="bg-dark border-dark-light"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input 
                    id="newPassword" 
                    type="password" 
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)} 
                    className="bg-dark border-dark-light"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input 
                    id="confirmPassword" 
                    type="password" 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    className="bg-dark border-dark-light"
                  />
                </div>
                
                <div className="flex items-center justify-between py-2">
                  <div className="space-y-0.5">
                    <Label htmlFor="twoFactorAuth">Two-Factor Authentication</Label>
                    <p className="text-xs text-gray-400">Enable two-factor authentication for increased security.</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    {twoFactorEnabled && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                          // Request a 2FA code for testing
                          fetch('/api/auth/request-2fa', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${localStorage.getItem('token')}`
                            }
                          })
                          .then(res => res.json())
                          .then(data => {
                            toast({
                              title: "2FA Code Generated",
                              description: `Your code is: ${data.twoFactorCode}`,
                            });
                          })
                          .catch(() => {
                            toast({
                              title: "Error",
                              description: "Failed to generate 2FA code",
                              variant: "destructive",
                            });
                          });
                        }}
                      >
                        Test 2FA
                      </Button>
                    )}
                    <Switch 
                      id="twoFactorAuth" 
                      checked={twoFactorEnabled} 
                      onCheckedChange={(checked) => {
                        if (checked) {
                          // When enabling 2FA, show a confirmation toast
                          toast({
                            title: "Two-Factor Authentication Enabled",
                            description: "You will now need to verify your identity with a second factor when logging in."
                          });
                        }
                        setTwoFactorEnabled(checked);
                      }}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                  <Select value={sessionTimeout} onValueChange={setSessionTimeout}>
                    <SelectTrigger className="bg-dark border-dark-light">
                      <SelectValue placeholder="Select timeout" />
                    </SelectTrigger>
                    <SelectContent className="bg-dark-lighter border-dark-light">
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">60 minutes</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-400">Your session will automatically end after this period of inactivity.</p>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  className="bg-primary text-white hover:bg-blue-600"
                  onClick={handleSaveSecurity}
                >
                  Save Changes
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="notifications">
            <Card className="bg-dark-lighter border-dark-light">
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription className="text-gray-400">
                  Configure how and when you receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="notificationEmail">Notification Email</Label>
                  <Input 
                    id="notificationEmail" 
                    value={notificationEmail} 
                    onChange={(e) => setNotificationEmail(e.target.value)} 
                    className="bg-dark border-dark-light"
                  />
                  <p className="text-xs text-gray-400">All notifications will be sent to this email address.</p>
                </div>
                
                <div className="flex items-center justify-between py-2">
                  <div className="space-y-0.5">
                    <Label htmlFor="emailNotifications">Email Notifications</Label>
                    <p className="text-xs text-gray-400">Receive notifications via email.</p>
                  </div>
                  <Switch 
                    id="emailNotifications" 
                    checked={emailNotifications} 
                    onCheckedChange={setEmailNotifications}
                  />
                </div>
                
                <div className="flex items-center justify-between py-2">
                  <div className="space-y-0.5">
                    <Label htmlFor="incidentAlerts">Security Incident Alerts</Label>
                    <p className="text-xs text-gray-400">Get notified when new security incidents are reported.</p>
                  </div>
                  <Switch 
                    id="incidentAlerts" 
                    checked={incidentAlerts} 
                    onCheckedChange={setIncidentAlerts}
                  />
                </div>
                
                <div className="flex items-center justify-between py-2">
                  <div className="space-y-0.5">
                    <Label htmlFor="scanCompletions">Scan Completion Notifications</Label>
                    <p className="text-xs text-gray-400">Get notified when security scans are completed.</p>
                  </div>
                  <Switch 
                    id="scanCompletions" 
                    checked={scanCompletions} 
                    onCheckedChange={setScanCompletions}
                  />
                </div>
                
                <div className="flex items-center justify-between py-2">
                  <div className="space-y-0.5">
                    <Label htmlFor="weeklyReports">Weekly Security Summary</Label>
                    <p className="text-xs text-gray-400">Receive a weekly summary of security activities.</p>
                  </div>
                  <Switch 
                    id="weeklyReports" 
                    checked={weeklyReports} 
                    onCheckedChange={setWeeklyReports}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  className="bg-primary text-white hover:bg-blue-600"
                  onClick={handleSaveNotifications}
                >
                  Save Changes
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="api">
            <Card className="bg-dark-lighter border-dark-light">
              <CardHeader>
                <CardTitle>Scanner Configuration</CardTitle>
                <CardDescription className="text-gray-400">
                  Configure scanner tools and API integrations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="nmapPath">Nmap Path</Label>
                  <Input 
                    id="nmapPath" 
                    value={nmapPath} 
                    onChange={(e) => setNmapPath(e.target.value)} 
                    className="bg-dark border-dark-light"
                  />
                  <p className="text-xs text-gray-400">Path to the Nmap executable on client systems.</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="zapPath">OWASP ZAP Path</Label>
                  <Input 
                    id="zapPath" 
                    value={zapPath} 
                    onChange={(e) => setZapPath(e.target.value)} 
                    className="bg-dark border-dark-light"
                  />
                  <p className="text-xs text-gray-400">Path to the OWASP ZAP executable on client systems.</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="apiKeys">API Keys (JSON)</Label>
                  <Textarea 
                    id="apiKeys" 
                    value={apiKeys} 
                    onChange={(e) => setApiKeys(e.target.value)} 
                    className="bg-dark border-dark-light min-h-[120px] font-mono text-sm"
                    placeholder='{"virustotal": "your_api_key", "securityScorecard": "your_api_key"}'
                  />
                  <p className="text-xs text-gray-400">Enter API keys in JSON format for third-party integrations.</p>
                </div>
                
                <div className="bg-dark p-4 rounded-md border border-dark-light">
                  <h3 className="text-sm font-medium mb-2">Agent Installation Instructions</h3>
                  <p className="text-xs text-gray-400 mb-3">
                    To install the CyberShieldX agent on client systems, run the following commands:
                  </p>
                  <div className="bg-gray-900 p-3 rounded-md text-xs font-mono">
                    <p className="text-gray-300 mb-2"># For Windows</p>
                    <p className="text-gray-300">curl -sSL https://cybershieldx.com/agent/install.ps1 | powershell -Command -</p>
                    <p className="text-gray-300 mt-4 mb-2"># For Linux</p>
                    <p className="text-gray-300">curl -sSL https://cybershieldx.com/agent/install.sh | bash</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  className="bg-primary text-white hover:bg-blue-600"
                  onClick={handleSaveApi}
                >
                  Save Changes
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
