import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useAuthB2C } from '../../contexts/AuthContextB2CSimple';
import { 
  Home, 
  BookOpen, 
  Ticket, 
  MessageSquare, 
  GraduationCap,
  LogOut,
  User,
  Menu,
  X,
  Building2,
  Bell,
  Settings,
  HelpCircle,
  Clock,
  Shield,
  Activity
} from 'lucide-react';
import { useState } from 'react';

export function Layout() {
  const { user, logout } = useAuthB2C();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Extract user info from B2C claims
  const userName = user?.name || user?.username || 'User';
  
  // Get user initials from name
  const getUserInitials = (name: string) => {
    if (!name || name === 'User') return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return parts[0][0].toUpperCase() + parts[parts.length - 1][0].toUpperCase();
    }
    return name[0].toUpperCase();
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Knowledge Base', href: '/knowledge', icon: BookOpen },
    { name: 'Tickets', href: '/tickets', icon: Ticket },
    { name: 'Chat Support', href: '/chat', icon: MessageSquare },
    { name: 'Training', href: '/training', icon: GraduationCap }
  ];

  return (
    <div className="h-screen w-full bg-gradient-to-b from-slate-50 to-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-[#0B2545] text-white">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden text-white/80 hover:text-white"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5" />
                <span className="text-sm opacity-80">AgentHub Support Portal</span>
                <div className="h-5 w-px bg-white/20" />
                <span className="text-sm font-semibold">Franchise Dashboard</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/30">Active</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 text-xs">
                <Clock className="h-4 w-4 opacity-80" />
                <span className="font-mono">{new Date().toLocaleTimeString()}</span>
              </div>
              
              <button className="relative p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                <Bell className="h-4 w-4" />
                <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 bg-[#E94B4B] rounded-full flex items-center justify-center">
                  <span className="text-white text-[7px] font-bold">3</span>
                </span>
              </button>
              
              <button className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                <HelpCircle className="h-4 w-4" />
              </button>
              
              <div className="h-8 w-px bg-white/20" />
              
              <button
                onClick={logout}
                className="px-3 py-1.5 rounded-lg bg-[#E94B4B] hover:bg-red-600 text-white text-sm flex items-center gap-2 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex">
          {/* Sidebar - Desktop */}
          <div className="hidden lg:block w-64 bg-white border-r border-gray-200 overflow-y-auto">
            {/* User Profile */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#E94B4B] to-red-600 flex items-center justify-center text-white font-bold">
                  {getUserInitials(userName)}
                </div>
                <div>
                  <div className="font-medium text-sm text-gray-900">{userName}</div>
                  <div className="text-xs text-gray-500">Franchisee #FR-12345</div>
                </div>
              </div>
            </div>
            
            {/* Store Info */}
            <div className="px-4 py-3 bg-gradient-to-b from-gray-50 to-white border-b border-gray-100">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Building2 className="h-3.5 w-3.5" />
                  <span className="font-medium">Store Locations</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {['0234', '0567', '0891'].map(store => (
                    <div key={store} className="px-2 py-1 bg-white border border-gray-200 rounded text-xs text-center font-mono">
                      #{store}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Navigation */}
            <nav className="p-3 space-y-1">
              {navigation.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-[#E94B4B] text-white shadow-sm'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`
                  }
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </NavLink>
              ))}
            </nav>
            
            
            
            {/* Settings */}
            <div className="p-4 border-t border-gray-100">
              <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                <Settings className="h-4 w-4" />
                Account Settings
              </button>
            </div>
          </div>

          {/* Mobile Sidebar */}
          <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? '' : 'hidden'}`}>
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
            <div className="fixed inset-y-0 left-0 flex flex-col w-64 bg-white">
              <div className="flex items-center justify-between h-14 px-4 bg-[#0B2545]">
                <span className="text-lg font-semibold text-white">Menu</span>
                <button onClick={() => setSidebarOpen(false)} className="text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              {/* Mobile User Profile */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#E94B4B] to-red-600 flex items-center justify-center text-white font-bold">
                    {getUserInitials(userName)}
                  </div>
                  <div>
                    <div className="font-medium text-sm text-gray-900">{userName}</div>
                    <div className="text-xs text-gray-500">Franchisee #FR-12345</div>
                  </div>
                </div>
              </div>
              
              {/* Mobile Navigation */}
              <nav className="flex-1 p-3 space-y-1">
                {navigation.map((item) => (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-[#E94B4B] text-white shadow-sm'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`
                    }
                    onClick={() => setSidebarOpen(false)}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </NavLink>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}