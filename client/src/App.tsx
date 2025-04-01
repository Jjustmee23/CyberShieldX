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
import LoginPage from "@/pages/auth/LoginPage";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { AuthProvider, useAuth } from "@/hooks/useAuth";

function AppRouter() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    // Show loading screen while checking authentication
    return (
      <div className="flex items-center justify-center min-h-screen bg-dark">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
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
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
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
