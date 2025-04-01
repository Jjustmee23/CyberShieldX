import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

interface NavItemProps {
  href: string;
  icon: string;
  children: React.ReactNode;
  active?: boolean;
}

const NavItem = ({ href, icon, children, active }: NavItemProps) => {
  const [, navigate] = useLocation();

  return (
    <a
      href={href}
      onClick={(e) => {
        e.preventDefault();
        navigate(href);
      }}
      className={cn(
        "flex items-center space-x-3 px-3 py-2 rounded-md transition-colors",
        active
          ? "text-gray-100 bg-primary"
          : "text-gray-300 hover:bg-dark-light"
      )}
    >
      <i className={`fas ${icon} w-5 h-5`}></i>
      <span>{children}</span>
    </a>
  );
};

export default function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  return (
    <aside className="hidden md:flex flex-col w-64 bg-dark-lighter">
      <div className="p-4 flex items-center border-b border-dark-light">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
            <i className="fas fa-shield-alt text-white"></i>
          </div>
          <h1 className="text-xl font-bold text-white">CyberShieldX</h1>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <NavItem href="/" icon="fa-th-large" active={location === "/"}>
          Dashboard
        </NavItem>

        <NavItem
          href="/clients"
          icon="fa-users"
          active={location === "/clients"}
        >
          Clients
        </NavItem>

        <NavItem
          href="/scans"
          icon="fa-search"
          active={location === "/scans"}
        >
          Scans
        </NavItem>

        <NavItem
          href="/reports"
          icon="fa-file-alt"
          active={location === "/reports"}
        >
          Reports
        </NavItem>

        <NavItem
          href="/training"
          icon="fa-graduation-cap"
          active={location === "/training"}
        >
          Training
        </NavItem>

        <NavItem
          href="/incidents"
          icon="fa-exclamation-triangle"
          active={location === "/incidents"}
        >
          Incidents
        </NavItem>

        <div className="pt-4 mt-4 border-t border-dark-light">
          <h3 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Settings
          </h3>
        </div>

        <NavItem
          href="/settings"
          icon="fa-cog"
          active={location === "/settings"}
        >
          General
        </NavItem>

        <NavItem
          href="/settings/security"
          icon="fa-lock"
          active={location === "/settings/security"}
        >
          Security
        </NavItem>

        <NavItem
          href="/settings/notifications"
          icon="fa-bell"
          active={location === "/settings/notifications"}
        >
          Notifications
        </NavItem>
        
        <div className="pt-4 mt-4 border-t border-dark-light">
          <h3 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Resources
          </h3>
        </div>
        
        <NavItem
          href="/downloads"
          icon="fa-download"
          active={location === "/downloads"}
        >
          Downloads
        </NavItem>
      </nav>

      <div className="p-4 border-t border-dark-light">
        <a
          href="#"
          className="flex items-center space-x-3 px-3 py-2 text-gray-300 hover:bg-dark-light rounded-md"
        >
          <i className="fas fa-question-circle w-5 h-5"></i>
          <span>Help &amp; Support</span>
        </a>
      </div>
    </aside>
  );
}
