import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Cpu, Server, HardDrive } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

interface DownloadFile {
  name: string;
  url: string;
  size: number;
}

export default function DownloadsPage() {
  const [activeTab, setActiveTab] = useState("windows");

  const { data: downloads, isLoading } = useQuery({
    queryKey: ["/api/downloads/list"],
    queryFn: async () => {
      const res = await fetch("/api/downloads/list");
      if (!res.ok) throw new Error("Failed to fetch downloads");
      return res.json() as Promise<DownloadFile[]>;
    },
  });

  // Format bytes to readable format
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  const handleDownload = (url: string, name: string) => {
    // Create an anchor element and trigger the download
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Get download for specific platform and file type
  const getDownload = (
    platform: string,
    fileType: string
  ): DownloadFile | undefined => {
    if (!downloads) return undefined;
    return downloads.find((d) => d.name.includes(platform) && d.name.includes(fileType));
  };

  const getInstaller = (platform: string): DownloadFile | undefined => {
    if (!downloads) return undefined;
    const platformMap = {
      windows: "install-windows.ps1",
      linux: "install-linux.sh",
      raspberry: "install-raspberry.sh",
    };
    const file = platformMap[platform as keyof typeof platformMap];
    return downloads.find((d) => d.name === file);
  };

  return (
    <div className="py-8 px-4 md:px-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Downloads</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Download the CyberShieldX agent for your devices
        </p>
      </div>

      <Tabs defaultValue="windows" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="mb-8">
          <TabsTrigger value="windows" className="flex items-center gap-2">
            <HardDrive className="w-4 h-4" /> Windows
          </TabsTrigger>
          <TabsTrigger value="linux" className="flex items-center gap-2">
            <Server className="w-4 h-4" /> Linux
          </TabsTrigger>
          <TabsTrigger value="raspberry" className="flex items-center gap-2">
            <Cpu className="w-4 h-4" /> Raspberry Pi
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex items-center gap-2">
            <Download className="w-4 h-4" /> Manual
          </TabsTrigger>
        </TabsList>

        <TabsContent value="windows" className="space-y-8">
          <div className="grid md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Windows Agent</CardTitle>
                <CardDescription>
                  Install the CyberShieldX agent on Windows systems
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p>
                    The CyberShieldX Windows agent provides comprehensive security monitoring for Windows systems. Features include:
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Network security scanning</li>
                    <li>Malware detection and prevention</li>
                    <li>System vulnerability assessment</li>
                    <li>Real-time threat monitoring</li>
                    <li>Automated security updates</li>
                  </ul>
                  <p className="text-sm text-gray-500 mt-4">
                    Compatible with Windows 10, Windows 11, and Windows Server 2016+
                  </p>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  variant="default"
                  className="w-full"
                  disabled={isLoading || !getInstaller("windows")}
                  onClick={() => {
                    const installer = getInstaller("windows");
                    if (installer) {
                      handleDownload(installer.url, installer.name);
                    }
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Installer
                  {getInstaller("windows") && 
                    <span className="ml-2 text-xs opacity-70">
                      ({formatBytes(getInstaller("windows")!.size)})
                    </span>
                  }
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Installation Instructions</CardTitle>
                <CardDescription>
                  How to install the Windows agent
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <h3 className="font-semibold">Prerequisites</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Windows 10/11 or Windows Server 2016+</li>
                    <li>Administrator privileges</li>
                    <li>Client ID from your administrator</li>
                    <li>Outbound internet connectivity</li>
                  </ul>

                  <h3 className="font-semibold">Installation Steps</h3>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Download the installer script</li>
                    <li>Right-click the script and select "Run with PowerShell"</li>
                    <li>If prompted, confirm to run the script</li>
                    <li>Enter your Server URL when requested (or press Enter for default)</li>
                    <li>Enter your Client ID when requested</li>
                    <li>Wait for the installation to complete</li>
                  </ol>
                  
                  <div className="text-sm bg-gray-100 dark:bg-gray-800 p-3 rounded mt-4">
                    <code>PowerShell -ExecutionPolicy Bypass -File install-windows.ps1</code>
                  </div>
                  
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-300">New!</p>
                    <p className="text-sm mt-1">Our improved installer now lets you specify both the server URL and client ID during installation for easier custom deployments.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="linux" className="space-y-8">
          <div className="grid md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Linux Agent</CardTitle>
                <CardDescription>
                  Install the CyberShieldX agent on Linux systems
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p>
                    The CyberShieldX Linux agent provides comprehensive security monitoring for Linux servers and desktops. Features include:
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Network intrusion detection</li>
                    <li>File integrity monitoring</li>
                    <li>System vulnerability assessment</li>
                    <li>Log monitoring and analysis</li>
                    <li>Security compliance reporting</li>
                  </ul>
                  <p className="text-sm text-gray-500 mt-4">
                    Compatible with Ubuntu, Debian, CentOS, RHEL, and Fedora distributions
                  </p>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  variant="default"
                  className="w-full"
                  disabled={isLoading || !getInstaller("linux")}
                  onClick={() => {
                    const installer = getInstaller("linux");
                    if (installer) {
                      handleDownload(installer.url, installer.name);
                    }
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Installer
                  {getInstaller("linux") && 
                    <span className="ml-2 text-xs opacity-70">
                      ({formatBytes(getInstaller("linux")!.size)})
                    </span>
                  }
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Installation Instructions</CardTitle>
                <CardDescription>
                  How to install the Linux agent
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <h3 className="font-semibold">Prerequisites</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Supported Linux distribution</li>
                    <li>Root or sudo privileges</li>
                    <li>Client ID from your administrator</li>
                    <li>Outbound internet connectivity</li>
                  </ul>

                  <h3 className="font-semibold">Installation Steps</h3>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Download the installer script</li>
                    <li>Make the script executable with <code>chmod +x install-linux.sh</code></li>
                    <li>Run the script with sudo: <code>sudo ./install-linux.sh</code></li>
                    <li>Enter your Server URL when requested (or press Enter for default)</li>
                    <li>Enter your Client ID when requested</li>
                    <li>Wait for the installation to complete</li>
                  </ol>
                  
                  <div className="text-sm bg-gray-100 dark:bg-gray-800 p-3 rounded mt-4">
                    <code>sudo bash install-linux.sh</code>
                  </div>
                  
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-300">New!</p>
                    <p className="text-sm mt-1">Our improved installer now lets you specify both the server URL and client ID during installation for easier custom deployments.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="raspberry" className="space-y-8">
          <div className="grid md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Raspberry Pi Agent</CardTitle>
                <CardDescription>
                  Install the CyberShieldX agent on Raspberry Pi devices
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p>
                    The optimized CyberShieldX agent for Raspberry Pi provides lightweight security monitoring. Features include:
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Network monitoring and intrusion detection</li>
                    <li>IoT device security</li>
                    <li>Peripheral device monitoring</li>
                    <li>Resource-efficient scanning</li>
                    <li>Remote management</li>
                  </ul>
                  <p className="text-sm text-gray-500 mt-4">
                    Compatible with Raspberry Pi 3, 4, and 5 running Raspberry Pi OS
                  </p>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  variant="default"
                  className="w-full"
                  disabled={isLoading || !getInstaller("raspberry")}
                  onClick={() => {
                    const installer = getInstaller("raspberry");
                    if (installer) {
                      handleDownload(installer.url, installer.name);
                    }
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Installer
                  {getInstaller("raspberry") && 
                    <span className="ml-2 text-xs opacity-70">
                      ({formatBytes(getInstaller("raspberry")!.size)})
                    </span>
                  }
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Installation Instructions</CardTitle>
                <CardDescription>
                  How to install the Raspberry Pi agent
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <h3 className="font-semibold">Prerequisites</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Raspberry Pi 3, 4, or 5</li>
                    <li>Raspberry Pi OS (32-bit or 64-bit)</li>
                    <li>Root or sudo privileges</li>
                    <li>Client ID from your administrator</li>
                    <li>Outbound internet connectivity</li>
                  </ul>

                  <h3 className="font-semibold">Installation Steps</h3>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Download the installer script</li>
                    <li>Make the script executable with <code>chmod +x install-raspberry.sh</code></li>
                    <li>Run the script with sudo: <code>sudo ./install-raspberry.sh</code></li>
                    <li>Enter your Server URL when requested (or press Enter for default)</li>
                    <li>Enter your Client ID when requested</li>
                    <li>Wait for the installation to complete</li>
                  </ol>
                  
                  <div className="text-sm bg-gray-100 dark:bg-gray-800 p-3 rounded mt-4">
                    <code>sudo bash install-raspberry.sh</code>
                  </div>
                  
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-300">New!</p>
                    <p className="text-sm mt-1">Our improved installer now lets you specify both the server URL and client ID during installation for easier custom deployments.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="manual" className="space-y-8">
          <div className="grid md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Agent Packages</CardTitle>
                <CardDescription>
                  Manual download of CyberShieldX agent packages
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="mb-4">
                    For advanced users who need to manually install the agent or distribute installation packages.
                  </p>
                  
                  <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-300">New! Windows Executable Installer</p>
                    <p className="text-sm mt-1">We now offer a graphical installer for Windows that allows you to enter server URL and client ID during installation.</p>
                    <p className="text-sm mt-2">The <span className="font-mono">CyberShieldX-Installer.txt</span> file contains the NSIS script used to build the installer if you need to customize it for enterprise deployment.</p>
                  </div>
                  
                  <div className="space-y-4">
                    {isLoading ? (
                      <div className="p-4 text-center">Loading downloads...</div>
                    ) : (
                      <div className="divide-y">
                        {downloads?.map((file) => (
                          <div key={file.name} className="py-3 flex justify-between items-center">
                            <div>
                              <p className="font-medium">{file.name}</p>
                              <p className="text-sm text-gray-500">{formatBytes(file.size)}</p>
                              {file.name === "CyberShieldX-Installer.txt" && (
                                <p className="text-xs text-blue-500">NSIS installer script template</p>
                              )}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownload(file.url, file.name)}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Documentation</CardTitle>
                <CardDescription>
                  CyberShieldX user manual and documentation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p>
                    Access comprehensive documentation for the CyberShieldX platform and agents:
                  </p>
                  
                  <div className="divide-y">
                    <div className="py-3 flex justify-between items-center">
                      <div>
                        <p className="font-medium">CyberShieldX User Manual</p>
                        <p className="text-sm text-gray-500">Complete platform documentation</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isLoading || !downloads?.find(d => d.name === "CyberShieldX-Manual.pdf")}
                        onClick={() => {
                          const manual = downloads?.find(d => d.name === "CyberShieldX-Manual.pdf");
                          if (manual) {
                            handleDownload(manual.url, manual.name);
                          }
                        }}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                    
                    <div className="py-3 flex justify-between items-center">
                      <div>
                        <p className="font-medium">Quick Start Guide</p>
                        <p className="text-sm text-gray-500">Getting started with CyberShieldX</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open("/docs/quick-start", "_blank")}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        View Online
                      </Button>
                    </div>
                    
                    <div className="py-3 flex justify-between items-center">
                      <div>
                        <p className="font-medium">API Documentation</p>
                        <p className="text-sm text-gray-500">For developers integrating with CyberShieldX</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open("/docs/api", "_blank")}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        View Online
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}