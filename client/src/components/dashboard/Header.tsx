import React from 'react';
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut, User, Shield } from "lucide-react";
import UpdateAgentsButton from '@/components/dashboard/UpdateAgentsButton';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

/**
 * Dashboard header component with title, user info and update agents button
 */
const Header: React.FC<HeaderProps> = ({ title, subtitle }) => {
  const { user, logout } = useAuth();

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center py-4 px-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{title}</h1>
        {subtitle && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center mt-4 md:mt-0 w-full md:w-auto justify-between md:justify-end space-x-4">
        {/* Update Agents Button */}
        <UpdateAgentsButton variant="outline" size="sm" />
        
        {/* User Info */}
        <div className="flex items-center">
          <div className="mr-2 bg-primary/10 text-primary p-2 rounded-full">
            <User size={16} />
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium">{user?.name || user?.username}</p>
            <p className="text-xs text-gray-500">{user?.role}</p>
          </div>
        </div>
        
        {/* Logout Button */}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={logout}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <LogOut size={16} className="mr-2" />
          <span className="hidden md:inline">Uitloggen</span>
        </Button>
      </div>
    </div>
  );
};

export default Header;