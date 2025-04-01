import { Card } from "@/components/ui/card";

interface StatusCardProps {
  title: string;
  value: string | number;
  icon: string;
  iconBgClass: string;
  iconTextClass: string;
  changeText?: string;
  changeIcon?: string;
  changeTextClass?: string;
}

const StatusCard = ({
  title,
  value,
  icon,
  iconBgClass,
  iconTextClass,
  changeText,
  changeIcon = "fa-arrow-up",
  changeTextClass = "text-green-500",
}: StatusCardProps) => {
  return (
    <Card className="bg-dark-lighter rounded-lg p-4 shadow">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-gray-400 text-sm font-medium">{title}</p>
          <h3 className="text-2xl font-bold mt-1">{value}</h3>
        </div>
        <div className={`${iconBgClass} p-2 rounded-md`}>
          <i className={`fas ${icon} ${iconTextClass}`}></i>
        </div>
      </div>
      {changeText && (
        <div className="flex items-center mt-4 text-sm">
          <div className={`flex items-center ${changeTextClass}`}>
            <i className={`fas ${changeIcon} mr-1`}></i>
            <span>{changeText}</span>
          </div>
        </div>
      )}
    </Card>
  );
};

interface StatusOverviewProps {
  totalClients: number;
  activeScansCount: number;
  securityIncidentsCount: number;
  trainingCompliance: number;
}

export default function StatusOverview({
  totalClients,
  activeScansCount,
  securityIncidentsCount,
  trainingCompliance,
}: StatusOverviewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <StatusCard
        title="Total Clients"
        value={totalClients}
        icon="fa-users"
        iconBgClass="bg-blue-500/20"
        iconTextClass="text-blue-500"
        changeText="+2 this month"
      />

      <StatusCard
        title="Active Scans"
        value={activeScansCount}
        icon="fa-spinner"
        iconBgClass="bg-emerald-500/20"
        iconTextClass="text-emerald-500"
        changeText={`${activeScansCount > 0 ? `${activeScansCount} ${activeScansCount === 1 ? 'scan' : 'scans'} running` : 'No active scans'}`}
        changeTextClass="text-emerald-500"
      />

      <StatusCard
        title="Security Incidents"
        value={securityIncidentsCount}
        icon="fa-exclamation-triangle"
        iconBgClass="bg-red-500/20"
        iconTextClass="text-red-500"
        changeText={securityIncidentsCount > 0 ? `${Math.min(securityIncidentsCount, 2)} unresolved` : "No incidents"}
        changeIcon={securityIncidentsCount > 0 ? "fa-arrow-up" : "fa-check"}
        changeTextClass={securityIncidentsCount > 0 ? "text-red-500" : "text-green-500"}
      />

      <StatusCard
        title="Training Compliance"
        value={`${trainingCompliance}%`}
        icon="fa-graduation-cap"
        iconBgClass="bg-purple-500/20"
        iconTextClass="text-purple-500"
        changeText="+12% from last month"
      />
    </div>
  );
}
