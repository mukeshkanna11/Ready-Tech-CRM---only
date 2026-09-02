import {
  LayoutDashboard,
  Users,
  ContactRound,
  Building2,
  BriefcaseBusiness,
  CalendarClock,
  Bell,
  Settings,
  X,
} from "lucide-react";

import { NavLink } from "react-router-dom";
import { useState } from "react";

const navigation = [
  {
    section: "OVERVIEW",
    items: [
      {
        name: "Dashboard",
        path: "/dashboard",
        icon: LayoutDashboard,
      },
    ],
  },

  {
    section: "SALES",
    items: [
      {
        name: "Leads",
        path: "/leads",
        icon: Users,
      },
      {
        name: "Contacts",
        path: "/contacts",
        icon: ContactRound,
      },
      {
        name: "Companies",
        path: "/companies",
        icon: Building2,
      },
      {
        name: "Opportunities",
        path: "/opportunities",
        icon: BriefcaseBusiness,
      },
      {
        name: "Follow-ups",
        path: "/follow-ups",
        icon: CalendarClock,
      },
    ],
  },

  {
    section: "MANAGEMENT",
    items: [
      {
        name: "Notifications",
        path: "/notifications",
        icon: Bell,
      },
      {
        name: "Settings",
        path: "/settings",
        icon: Settings,
      },
    ],
  },
];

function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 top-0 z-50
          flex h-screen w-[260px]
          flex-col
          border-r border-slate-200
          bg-white
          shadow-xl
          transition-transform duration-300
          lg:translate-x-0
          ${
            mobileOpen
              ? "translate-x-0"
              : "-translate-x-full"
          }
        `}
      >
        {/* Brand */}
        <div className="flex h-[76px] items-center justify-between border-b border-slate-200 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-blue-500 text-lg font-black text-white shadow-lg shadow-indigo-200">
              R
            </div>

            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900">
                READY CRM
              </h1>

              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Sales Platform
              </p>
            </div>
          </div>

          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-6">
          {navigation.map((group) => (
            <div
              key={group.section}
              className="mb-7"
            >
              <p className="mb-3 px-3 text-[10px] font-bold tracking-[0.16em] text-slate-400">
                {group.section}
              </p>

              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;

                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() =>
                        setMobileOpen(false)
                      }
                      className={({ isActive }) =>
                        `
                        group flex items-center gap-3
                        rounded-xl px-3 py-3
                        text-sm font-medium
                        transition-all duration-200
                        ${
                          isActive
                            ? "bg-indigo-50 text-indigo-700 shadow-sm"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        }
                        `
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <span
                            className={`
                              flex h-9 w-9 items-center justify-center
                              rounded-lg
                              ${
                                isActive
                                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                                  : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                              }
                            `}
                          >
                            <Icon size={17} />
                          </span>

                          <span className="flex-1">
                            {item.name}
                          </span>

                          {isActive && (
                            <span className="h-2 w-2 rounded-full bg-indigo-600" />
                          )}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User Card */}
        <div className="border-t border-slate-200 p-4">
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 font-bold text-white">
              S
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800">
                Sivashankar
              </p>

              <p className="truncate text-xs text-slate-400">
                Managing Director
              </p>
            </div>

            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
          </div>
        </div>
      </aside>

      {/* Mobile button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed bottom-5 left-5 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-white shadow-xl lg:hidden"
      >
        <span className="text-xl">☰</span>
      </button>
    </>
  );
}

export default Sidebar;