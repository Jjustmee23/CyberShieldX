import { Route, Router, Switch } from "wouter";
import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard/Dashboard";
import ClientsPage from "@/pages/clients/ClientsPage";
import ScansPage from "@/pages/scans/ScansPage";
import ReportsPage from "@/pages/reports/ReportsPage";
import TrainingPage from "@/pages/training/TrainingPage";
import IncidentsPage from "@/pages/incidents/IncidentsPage";
import SettingsPage from "@/pages/settings/SettingsPage";
import DownloadsPage from "@/pages/downloads/DownloadsPage";
import LoginPage from "@/pages/auth/LoginPage";
import FirstSetupPage from "@/pages/auth/FirstSetupPage";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import ChangePasswordModal from "@/components/modals/ChangePasswordModal";
import { AuthProvider, useAuth } from "@/hooks/useAuth";

function AppRouter() {
  const { isAuthenticated, isLoading, requirePasswordChange, user, updateUser } = useAuth();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [setupNeeded, setSetupNeeded] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);
  
  // Check if setup is needed
  useEffect(() => {
    async function checkSetupStatus() {
      try {
        const response = await fetch('/api/setup/check');
        const data = await response.json();
        setSetupNeeded(data.setupNeeded);
      } catch (error) {
        console.error('Failed to check setup status:', error);
        // Assume setup is not needed if we can't check
        setSetupNeeded(false);
      } finally {
        setCheckingSetup(false);
      }
    }
    
    checkSetupStatus();
  }, []);
  
  // Effect to show password change modal when requirePasswordChange is true
  useEffect(() => {
    if (requirePasswordChange && isAuthenticated) {
      setShowPasswordModal(true);
    }
  }, [requirePasswordChange, isAuthenticated]);

  // Special route for downloads page - accessible without authentication
  if (window.location.pathname === "/downloads") {
    return <DownloadsPage />;
  }

  // Show loading screen while checking setup status and authentication
  if (checkingSetup || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-dark">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show setup page if needed
  if (setupNeeded) {
    return <FirstSetupPage />;
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-dark text-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 bg-dark">
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/clients" component={ClientsPage} />
            <Route path="/scans" component={ScansPage} />
            <Route path="/reports" component={ReportsPage} />
            <Route path="/training" component={TrainingPage} />
            <Route path="/incidents" component={IncidentsPage} />
            <Route path="/settings" component={SettingsPage} />
            <Route path="/downloads" component={DownloadsPage} />
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
      
      {/* Modal voor verplichte wachtwoord wijziging */}
      <ChangePasswordModal 
        isOpen={showPasswordModal}
        isMandatory={requirePasswordChange}
        onClose={() => {
          if (!requirePasswordChange) {
            setShowPasswordModal(false);
          }
        }}
        onPasswordChanged={(updatedUser) => {
          updateUser(updatedUser);
          setShowPasswordModal(false);
        }}
      />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRouter />
      </Router>
    </AuthProvider>
  );
}

export default App;
