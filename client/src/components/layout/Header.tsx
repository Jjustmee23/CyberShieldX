import { useAuth } from "@/hooks/useAuth";

export default function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="bg-dark-lighter border-b border-dark-light">
      <div className="flex items-center justify-between p-4">
        <button className="md:hidden text-gray-300">
          <i className="fas fa-bars"></i>
        </button>

        <div className="flex items-center space-x-4 ml-auto">
          <button className="text-gray-300 hover:text-white">
            <i className="fas fa-bell"></i>
          </button>

          <div className="relative">
            <div className="flex items-center space-x-2 text-gray-300 hover:text-white">
              <span>{user?.name || "User"}</span>
              <div className="h-8 w-8 rounded-full bg-gray-500 text-white flex items-center justify-center">
                {user?.name ? user.name[0].toUpperCase() : "U"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
