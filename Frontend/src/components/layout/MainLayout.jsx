import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  FileText,
  ShoppingCart,
} from "lucide-react";

import {
  Activity,
  Bell,
  Building2,
  ChevronRight,
  CircleHelp,
  Command,
  ContactRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  PanelLeftClose,
  Search,
  Settings,
  Target,
  UserRoundSearch,
  X,
} from "lucide-react";

// ======================================================
// NAVIGATION
// ======================================================

const navigation = [
  {
    name: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
    description: "Overview & insights",
  },
  {
    name: "Leads",
    path: "/leads",
    icon: UserRoundSearch,
    description: "Manage prospects",
  },
  {
    name: "Contacts",
    path: "/contacts",
    icon: ContactRound,
    description: "Customer contacts",
  },
  {
    name: "Companies",
    path: "/companies",
    icon: Building2,
    description: "Customer accounts",
  },
  {
    name: "Products",
    path: "/products",
    icon: Package,
    description: "Products & inventory",
  },
  {
    name: "Opportunities",
    path: "/opportunities",
    icon: Target,
    description: "Sales pipeline & deals",
  },
  {
    name: "Quotations",
    path: "/quotations",
    icon: FileText,
    description: "Sales quotations",
  },
  {
    name: "Sales Orders",
    path: "/sales-orders",
    icon: ShoppingCart,
    description: "Manage customer orders",
  },
];

// ======================================================
// HELPERS
// ======================================================

const getStoredUser = () => {
  try {
    const user = localStorage.getItem("user");

    if (!user) {
      return null;
    }

    return JSON.parse(user);
  } catch (error) {
    console.error(
      "Failed to parse stored user:",
      error
    );

    return null;
  }
};

const getInitials = (name = "") => {
  const value = String(name).trim();

  if (!value) {
    return "U";
  }

  const parts = value.split(/\s+/);

  if (parts.length === 1) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const formatRole = (role) => {
  if (!role) {
    return "User";
  }

  const roleName =
    typeof role === "object"
      ? role?.name
      : role;

  return String(roleName)
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) =>
      char.toUpperCase()
    );
};

// ======================================================
// MAIN LAYOUT
// ======================================================

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const [
    mobileSidebarOpen,
    setMobileSidebarOpen,
  ] = useState(false);

  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] =
    useState(false);

  const [user, setUser] = useState(() =>
    getStoredUser()
  );

  const [loggingOut, setLoggingOut] =
    useState(false);

  // ====================================================
  // CURRENT PAGE
  // ====================================================

  const currentPage = useMemo(() => {
    const matchedItem = navigation.find(
      (item) =>
        location.pathname === item.path ||
        location.pathname.startsWith(
          `${item.path}/`
        )
    );

    return (
      matchedItem || {
        name: "CRM Workspace",
        description:
          "Manage your customer relationships",
      }
    );
  }, [location.pathname]);

  // ====================================================
  // LOAD USER
  // ====================================================

  useEffect(() => {
    const handleStorageChange = () => {
      setUser(getStoredUser());
    };

    window.addEventListener(
      "storage",
      handleStorageChange
    );

    return () => {
      window.removeEventListener(
        "storage",
        handleStorageChange
      );
    };
  }, []);

  // ====================================================
  // CLOSE MOBILE SIDEBAR ON ROUTE CHANGE
  // ====================================================

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  // ====================================================
  // LOGOUT
  // ====================================================

  const handleLogout = async () => {
    if (loggingOut) {
      return;
    }

    try {
      setLoggingOut(true);

      try {
        const accessToken =
          localStorage.getItem("accessToken") ||
          localStorage.getItem("token");

        if (accessToken) {
          await fetch(
            "http://localhost:5000/api/v1/auth/logout",
            {
              method: "POST",
              credentials: "include",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type":
                  "application/json",
              },
            }
          );
        }
      } catch (logoutApiError) {
        console.warn(
          "Backend logout request failed:",
          logoutApiError
        );
      }

      // ----------------------------------------------
      // CLEAR LOCAL AUTH
      // ----------------------------------------------

      localStorage.removeItem("accessToken");
      localStorage.removeItem("access_token");
      localStorage.removeItem("token");

      localStorage.removeItem("refreshToken");
      localStorage.removeItem("refresh_token");

      localStorage.removeItem("user");
      localStorage.removeItem("rememberMe");

      sessionStorage.removeItem("accessToken");
      sessionStorage.removeItem("access_token");
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user");

      setUser(null);

      navigate("/login", {
        replace: true,
      });
    } catch (error) {
      console.error(
        "CRM LOGOUT ERROR:",
        error
      );

      localStorage.removeItem("accessToken");
      localStorage.removeItem("access_token");
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");

      sessionStorage.clear();

      setUser(null);

      navigate("/login", {
        replace: true,
      });
    } finally {
      setLoggingOut(false);
    }
  };

  // ====================================================
  // USER DATA
  // ====================================================

  const userName =
    user?.name ||
    user?.fullName ||
    "CRM User";

  const userEmail =
    user?.email ||
    "admin@readytechsolutions.in";

  const userRole =
    formatRole(user?.role) ||
    "Administrator";

  const initials = getInitials(userName);

  // ====================================================
  // SIDEBAR CONTENT
  // ====================================================

  const SidebarContent = ({
    mobile = false,
  }) => {
    const collapsed =
      desktopSidebarCollapsed && !mobile;

    return (
      <div className="flex h-full flex-col">
        {/* ==================================================
            BRAND
        ================================================== */}

        <div
          className={`relative flex h-[76px] shrink-0 items-center border-b border-white/[0.07] ${
            collapsed
              ? "justify-center px-3"
              : "px-5"
          }`}
        >
          <div
            className={`flex items-center ${
              collapsed
                ? "justify-center"
                : "gap-3"
            }`}
          >
            {/* Logo */}

            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[13px] bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-600 shadow-lg shadow-indigo-600/20">
              <div className="absolute inset-0 bg-white/10" />

              <span className="relative text-lg font-black tracking-tight text-white">
                R
              </span>
            </div>

            {!collapsed && (
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="truncate text-[14px] font-bold tracking-tight text-white">
                    ReadyTech
                  </h1>

                  <span className="rounded-md bg-blue-500/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-blue-400">
                    CRM
                  </span>
                </div>

                <p className="mt-0.5 truncate text-[10px] text-slate-500">
                  Customer Relationship Platform
                </p>
              </div>
            )}
          </div>

          {/* Desktop collapse */}

          {!mobile && !collapsed && (
            <button
              type="button"
              onClick={() =>
                setDesktopSidebarCollapsed(true)
              }
              className="absolute right-3 flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 transition hover:bg-white/[0.06] hover:text-slate-300"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose
                className="h-4 w-4"
                strokeWidth={1.8}
              />
            </button>
          )}

          {!mobile && collapsed && (
            <button
              type="button"
              onClick={() =>
                setDesktopSidebarCollapsed(false)
              }
              className="absolute -right-3 top-1/2 z-20 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-white/[0.08] bg-[#111827] text-slate-400 shadow-xl transition hover:text-white"
              aria-label="Expand sidebar"
            >
              <ChevronRight
                className="h-3.5 w-3.5"
                strokeWidth={2}
              />
            </button>
          )}
        </div>

        {/* ==================================================
            WORKSPACE
        ================================================== */}

        <div
          className={`pt-6 ${
            collapsed
              ? "px-3"
              : "px-4"
          }`}
        >
          {!collapsed && (
            <div className="mb-3 flex items-center justify-between px-2">
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-600">
                Workspace
              </p>

              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />

                <span className="text-[9px] font-medium text-slate-600">
                  Live
                </span>
              </span>
            </div>
          )}

          <nav className="space-y-1.5">
            {navigation.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  title={
                    collapsed
                      ? item.name
                      : undefined
                  }
                  className={({ isActive }) =>
                    [
                      "group relative flex items-center overflow-hidden rounded-xl transition-all duration-200",
                      collapsed
                        ? "justify-center px-2 py-3"
                        : "gap-3 px-3 py-2.5",
                      isActive
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/20"
                        : "text-slate-400 hover:bg-white/[0.045] hover:text-white",
                    ].join(" ")
                  }
                >
                  {({ isActive }) => (
                    <>
                      {/* Active indicator */}

                      {isActive && (
                        <span className="absolute left-0 top-2.5 bottom-2.5 w-0.5 rounded-r-full bg-white/90" />
                      )}

                      {/* Icon */}

                      <span
                        className={[
                          "flex shrink-0 items-center justify-center rounded-[10px] transition-all duration-200",
                          collapsed
                            ? "h-10 w-10"
                            : "h-9 w-9",
                          isActive
                            ? "bg-white/10 text-white"
                            : "bg-white/[0.035] text-slate-500 group-hover:bg-white/[0.07] group-hover:text-slate-200",
                        ].join(" ")}
                      >
                        <Icon
                          className={
                            collapsed
                              ? "h-[19px] w-[19px]"
                              : "h-[18px] w-[18px]"
                          }
                          strokeWidth={
                            isActive
                              ? 2
                              : 1.8
                          }
                        />
                      </span>

                      {/* Text */}

                      {!collapsed && (
                        <span className="min-w-0 flex-1">
                          <span
                            className={[
                              "block truncate text-[12px] font-semibold",
                              isActive
                                ? "text-white"
                                : "text-slate-300",
                            ].join(" ")}
                          >
                            {item.name}
                          </span>

                          <span
                            className={[
                              "mt-0.5 block truncate text-[9px]",
                              isActive
                                ? "text-blue-100/70"
                                : "text-slate-600",
                            ].join(" ")}
                          >
                            {item.description}
                          </span>
                        </span>
                      )}

                      {/* Active arrow */}

                      {!collapsed &&
                        isActive && (
                          <ChevronRight
                            className="h-3.5 w-3.5 shrink-0 text-white/60"
                            strokeWidth={2}
                          />
                        )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* ==================================================
            SYSTEM STATUS
        ================================================== */}

        <div
          className={`pt-6 ${
            collapsed
              ? "px-3"
              : "px-4"
          }`}
        >
          {collapsed ? (
            <div
              title="CRM services are operational"
              className="flex justify-center"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/10 bg-emerald-500/[0.05]">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50" />
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.045] to-white/[0.015] p-3.5">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity
                    className="h-3.5 w-3.5 text-slate-500"
                    strokeWidth={1.8}
                  />

                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                    System Status
                  </span>
                </div>

                <span className="flex items-center gap-1.5 text-[9px] font-semibold text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow shadow-emerald-400/50" />
                  Online
                </span>
              </div>

              <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
                <div className="h-full w-[92%] rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400" />
              </div>

              <p className="mt-2 text-[9px] text-slate-600">
                CRM services are operational
              </p>
            </div>
          )}
        </div>

        {/* ==================================================
            SPACER
        ================================================== */}

        <div className="flex-1" />

        {/* ==================================================
            USER PROFILE
        ================================================== */}

        <div
          className={`border-t border-white/[0.06] ${
            collapsed
              ? "p-3"
              : "p-4"
          }`}
        >
          {collapsed ? (
            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  navigate("/dashboard")
                }
                title={`${userName} · ${userRole}`}
                className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-600 text-[10px] font-bold text-white shadow-lg shadow-blue-600/10"
              >
                {initials}

                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0b101b] bg-emerald-400" />
              </button>

              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                title="Sign out"
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-red-500/[0.08] hover:text-red-400 disabled:opacity-50"
              >
                {loggingOut ? (
                  <span className="text-sm">
                    …
                  </span>
                ) : (
                  <LogOut
                    className="h-4 w-4"
                    strokeWidth={1.8}
                  />
                )}
              </button>
            </div>
          ) : (
            <>
              <div className="mb-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3">
                <div className="flex items-center gap-3">
                  <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-600 text-xs font-bold text-white shadow-lg shadow-blue-600/10">
                    {initials}

                    <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0b101b] bg-emerald-400" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-bold text-white">
                      {userName}
                    </p>

                    <p className="mt-0.5 truncate text-[9px] text-slate-500">
                      {userEmail}
                    </p>

                    <span className="mt-1 inline-flex rounded-md bg-blue-500/10 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wider text-blue-400">
                      {userRole}
                    </span>
                  </div>

                  <Settings
                    className="h-3.5 w-3.5 shrink-0 text-slate-700"
                    strokeWidth={1.7}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="group flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left text-slate-400 transition-all duration-200 hover:border-red-500/10 hover:bg-red-500/[0.07] hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.035] transition-all group-hover:bg-red-500/10">
                  {loggingOut ? (
                    <span className="text-sm">
                      …
                    </span>
                  ) : (
                    <LogOut
                      className="h-4 w-4"
                      strokeWidth={1.8}
                    />
                  )}
                </span>

                <span className="flex-1">
                  <span className="block text-[11px] font-semibold">
                    {loggingOut
                      ? "Signing out..."
                      : "Sign out"}
                  </span>

                  <span className="mt-0.5 block text-[8px] text-slate-600">
                    End current session
                  </span>
                </span>

                {!loggingOut && (
                  <ChevronRight
                    className="h-3.5 w-3.5 text-slate-700 transition-transform group-hover:translate-x-0.5 group-hover:text-red-400"
                    strokeWidth={1.8}
                  />
                )}
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <div className="min-h-screen bg-[#070b14] text-white">
      {/* ==================================================
          DESKTOP SIDEBAR
      ================================================== */}

      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 hidden border-r border-white/[0.06] bg-[#0b101b] transition-all duration-300 lg:block",
          desktopSidebarCollapsed
            ? "w-[78px]"
            : "w-[270px]",
        ].join(" ")}
      >
        <SidebarContent />
      </aside>

      {/* ==================================================
          MOBILE OVERLAY
      ================================================== */}

      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={() =>
            setMobileSidebarOpen(false)
          }
        />
      )}

      {/* ==================================================
          MOBILE SIDEBAR
      ================================================== */}

      <aside
        className={[
          "fixed inset-y-0 left-0 z-[70] w-[280px] border-r border-white/[0.06] bg-[#0b101b] transition-transform duration-300 lg:hidden",
          mobileSidebarOpen
            ? "translate-x-0"
            : "-translate-x-full",
        ].join(" ")}
      >
        <button
          type="button"
          onClick={() =>
            setMobileSidebarOpen(false)
          }
          className="absolute right-3 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.05] text-slate-400 transition hover:bg-white/[0.1] hover:text-white"
          aria-label="Close sidebar"
        >
          <X
            className="h-4 w-4"
            strokeWidth={2}
          />
        </button>

        <SidebarContent mobile />
      </aside>

      {/* ==================================================
          MAIN AREA
      ================================================== */}

      <div
        className={[
          "min-h-screen transition-all duration-300",
          desktopSidebarCollapsed
            ? "lg:pl-[78px]"
            : "lg:pl-[270px]",
        ].join(" ")}
      >
        {/* ==================================================
            TOP HEADER
        ================================================== */}

        <header className="sticky top-0 z-40 h-[74px] border-b border-white/[0.06] bg-[#070b14]/80 backdrop-blur-2xl">
          <div className="flex h-full items-center justify-between px-4 sm:px-6 lg:px-8">
            {/* LEFT */}

            <div className="flex min-w-0 items-center gap-3">
              {/* Mobile menu */}

              <button
                type="button"
                onClick={() =>
                  setMobileSidebarOpen(true)
                }
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.035] text-slate-400 transition hover:bg-white/[0.07] hover:text-white lg:hidden"
                aria-label="Open sidebar"
              >
                <Menu
                  className="h-5 w-5"
                  strokeWidth={1.8}
                />
              </button>

              {/* Page information */}

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="truncate text-[15px] font-bold tracking-tight text-white sm:text-base">
                    {currentPage.name}
                  </h2>

                  <span className="hidden items-center gap-1 rounded-full border border-emerald-500/10 bg-emerald-500/[0.07] px-2 py-0.5 text-[8px] font-bold text-emerald-400 sm:inline-flex">
                    <span className="h-1 w-1 rounded-full bg-emerald-400" />
                    LIVE
                  </span>
                </div>

                <div className="mt-0.5 hidden items-center gap-1.5 text-[10px] text-slate-600 sm:flex">
                  <span>Workspace</span>

                  <ChevronRight
                    className="h-3 w-3"
                    strokeWidth={1.7}
                  />

                  <span className="text-slate-500">
                    {currentPage.name}
                  </span>
                </div>
              </div>
            </div>

            {/* RIGHT */}

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Search */}

              <button
                type="button"
                className="hidden h-9 items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 text-slate-500 transition hover:border-white/10 hover:bg-white/[0.05] hover:text-slate-300 md:flex"
              >
                <Search
                  className="h-3.5 w-3.5"
                  strokeWidth={1.8}
                />

                <span className="text-[10px]">
                  Search CRM
                </span>

                <span className="ml-3 flex items-center gap-1 rounded-md border border-white/[0.07] px-1.5 py-0.5 text-[8px] text-slate-600">
                  <Command
                    className="h-2.5 w-2.5"
                    strokeWidth={1.8}
                  />
                  K
                </span>
              </button>

              {/* Mobile search */}

              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025] text-slate-400 transition hover:bg-white/[0.07] hover:text-white md:hidden"
                aria-label="Search"
              >
                <Search
                  className="h-4 w-4"
                  strokeWidth={1.8}
                />
              </button>

              {/* Help */}

              <button
                type="button"
                className="hidden h-9 w-9 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025] text-slate-400 transition hover:bg-white/[0.07] hover:text-white sm:flex"
                aria-label="Help"
              >
                <CircleHelp
                  className="h-4 w-4"
                  strokeWidth={1.7}
                />
              </button>

              {/* Notifications */}

              <button
                type="button"
                className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025] text-slate-400 transition hover:bg-white/[0.07] hover:text-white"
                aria-label="Notifications"
              >
                <Bell
                  className="h-4 w-4"
                  strokeWidth={1.8}
                />

                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-blue-500 shadow shadow-blue-500/60" />
              </button>

              {/* Divider */}

              <div className="hidden h-7 w-px bg-white/[0.07] sm:block" />

              {/* User */}

              <button
                type="button"
                onClick={() =>
                  navigate("/dashboard")
                }
                className="flex items-center gap-2 rounded-xl px-1 py-1 transition hover:bg-white/[0.05]"
              >
                <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 text-[10px] font-bold text-white shadow-md shadow-blue-500/10">
                  {initials}

                  <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-[#070b14] bg-emerald-400" />
                </div>

                <div className="hidden text-left sm:block">
                  <p className="max-w-[120px] truncate text-[10px] font-bold text-white">
                    {userName}
                  </p>

                  <p className="text-[8px] text-slate-500">
                    {userRole}
                  </p>
                </div>

                <ChevronRight
                  className="hidden h-3.5 w-3.5 text-slate-600 sm:block"
                  strokeWidth={1.8}
                />
              </button>
            </div>
          </div>
        </header>

        {/* ==================================================
            PAGE CONTENT
        ================================================== */}

        <main className="min-h-[calc(100vh-74px)]">
          <div className="p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>

        {/* ==================================================
            FOOTER
        ================================================== */}

        <footer className="border-t border-white/[0.05] px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-2 text-[9px] text-slate-600 sm:flex-row">
            <p>
              © {new Date().getFullYear()}{" "}
              ReadyTech Solutions. All rights reserved.
            </p>

            <div className="flex items-center gap-3">
              <span>ReadyTech CRM</span>

              <span className="h-1 w-1 rounded-full bg-slate-700" />

              <span>v1.0.0</span>

              <span className="h-1 w-1 rounded-full bg-slate-700" />

              <span className="flex items-center gap-1">
                <span className="h-1 w-1 rounded-full bg-emerald-400" />
                Operational
              </span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}