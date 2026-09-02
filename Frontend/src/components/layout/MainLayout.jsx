import React, { useEffect, useMemo, useState } from "react";
import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";


// ======================================================
// NAVIGATION
// ======================================================

const navigation = [
  {
  name: "Dashboard",
  path: "/dashboard",
  icon: "⌂",
  description: "Overview & insights",
},
{
  name: "Leads",
  path: "/leads",
  icon: "◈",
  description: "Manage prospects",
},
{
  name: "Contacts",
  path: "/contacts",
  icon: "◎",
  description: "Customer contacts",
},
{
  name: "Companies",
  path: "/companies",
  icon: "▣",
  description: "Customer companies & accounts",
},
{
  name: "Products",
  path: "/products",
  icon: "◇",
  description: "Products & inventory",
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
    console.error("Failed to parse stored user:", error);
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
    return parts[0].slice(0, 2).toUpperCase();
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
    .replace(/\b\w/g, (char) => char.toUpperCase());
};


// ======================================================
// MAIN LAYOUT
// ======================================================

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileSidebarOpen, setMobileSidebarOpen] =
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
        location.pathname.startsWith(`${item.path}/`)
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

      // ----------------------------------------------
      // Optional backend logout
      // ----------------------------------------------
      //
      // The access token is cleared locally regardless
      // of whether the backend logout request succeeds.
      //
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
      // Clear authentication
      // ----------------------------------------------

      localStorage.removeItem("accessToken");
      localStorage.removeItem("access_token");
      localStorage.removeItem("token");

      localStorage.removeItem("refreshToken");
      localStorage.removeItem("refresh_token");

      localStorage.removeItem("user");
      localStorage.removeItem("rememberMe");

      // ----------------------------------------------
      // Clear possible session storage
      // ----------------------------------------------

      sessionStorage.removeItem("accessToken");
      sessionStorage.removeItem("access_token");
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user");

      // ----------------------------------------------
      // Reset user state
      // ----------------------------------------------

      setUser(null);

      // ----------------------------------------------
      // Navigate to login
      // ----------------------------------------------

      navigate("/login", {
        replace: true,
      });
    } catch (error) {
      console.error(
        "CRM LOGOUT ERROR:",
        error
      );

      // Always clear local auth on logout failure
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

  const initials =
    getInitials(userName);


  // ====================================================
  // SIDEBAR
  // ====================================================

  const SidebarContent = () => (
    <div className="flex h-full flex-col">

      {/* ================================================
          BRAND
      ================================================ */}

      <div className="flex h-[84px] items-center border-b border-white/[0.06] px-5">

        <div className="flex w-full items-center gap-3">

          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-600 shadow-lg shadow-blue-600/20">

            <div className="absolute inset-0 bg-white/10" />

            <span className="relative text-lg font-black tracking-tight">
              R
            </span>

          </div>


          <div className="min-w-0 flex-1">

            <div className="flex items-center gap-2">

              <h1 className="truncate text-sm font-bold tracking-tight text-white">
                ReadyTech
              </h1>

              <span className="rounded-md bg-blue-500/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-blue-400">
                CRM
              </span>

            </div>

            <p className="mt-0.5 truncate text-[11px] text-slate-500">
              Customer Relationship Platform
            </p>

          </div>

        </div>

      </div>


      {/* ================================================
          WORKSPACE
      ================================================ */}

      <div className="px-4 pt-6">

        <div className="mb-3 flex items-center justify-between px-2">

          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">
            Workspace
          </p>

          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />

        </div>


        <nav className="space-y-1.5">

          {navigation.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                [
                  "group relative flex items-center gap-3 overflow-hidden rounded-xl px-3.5 py-3 transition-all duration-200",
                  isActive
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/20"
                    : "text-slate-400 hover:bg-white/[0.05] hover:text-white",
                ].join(" ")
              }
            >

              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full bg-white/80" />
                  )}

                  <span
                    className={[
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base transition-all",
                      isActive
                        ? "bg-white/10 text-white"
                        : "bg-white/[0.035] text-slate-500 group-hover:bg-white/[0.08] group-hover:text-slate-200",
                    ].join(" ")}
                  >
                    {item.icon}
                  </span>


                  <span className="min-w-0 flex-1">

                    <span
                      className={[
                        "block text-sm font-semibold",
                        isActive
                          ? "text-white"
                          : "text-slate-300",
                      ].join(" ")}
                    >
                      {item.name}
                    </span>

                    <span
                      className={[
                        "mt-0.5 block truncate text-[10px]",
                        isActive
                          ? "text-blue-100/70"
                          : "text-slate-600",
                      ].join(" ")}
                    >
                      {item.description}
                    </span>

                  </span>


                  {isActive && (
                    <span className="text-xs text-white/60">
                      →
                    </span>
                  )}
                </>
              )}

            </NavLink>
          ))}

        </nav>

      </div>


      {/* ================================================
          QUICK STATUS
      ================================================ */}

      <div className="px-4 pt-6">

        <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.045] to-white/[0.015] p-4">

          <div className="mb-3 flex items-center justify-between">

            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              System Status
            </span>

            <span className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-400">

              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow shadow-emerald-400/50" />

              Online

            </span>

          </div>


          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">

            <div className="h-full w-[92%] rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400" />

          </div>


          <p className="mt-2 text-[10px] text-slate-600">
            CRM services are operational
          </p>

        </div>

      </div>


      {/* ================================================
          SPACER
      ================================================ */}

      <div className="flex-1" />


      {/* ================================================
          USER PROFILE
      ================================================ */}

      <div className="border-t border-white/[0.06] p-4">

        <div className="mb-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3">

          <div className="flex items-center gap-3">

            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-600 text-xs font-bold text-white shadow-lg shadow-blue-600/10">

              {initials}

              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-slate-950 bg-emerald-400" />

            </div>


            <div className="min-w-0 flex-1">

              <p className="truncate text-xs font-bold text-white">
                {userName}
              </p>

              <p className="mt-0.5 truncate text-[10px] text-slate-500">
                {userEmail}
              </p>

              <span className="mt-1 inline-flex rounded-md bg-blue-500/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-blue-400">
                {userRole}
              </span>

            </div>

          </div>

        </div>


        {/* ================================================
            LOGOUT BUTTON
        ================================================ */}

        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="group flex w-full items-center gap-3 rounded-xl border border-transparent px-3.5 py-3 text-left text-slate-400 transition-all duration-200 hover:border-red-500/10 hover:bg-red-500/[0.07] hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
        >

          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.035] text-sm transition-all group-hover:bg-red-500/10">
            {loggingOut ? "…" : "↪"}
          </span>

          <span className="flex-1">

            <span className="block text-xs font-semibold">
              {loggingOut
                ? "Signing out..."
                : "Sign out"}
            </span>

            <span className="mt-0.5 block text-[9px] text-slate-600">
              End current session
            </span>

          </span>

          {!loggingOut && (
            <span className="text-xs text-slate-600 transition-transform group-hover:translate-x-0.5 group-hover:text-red-400">
              →
            </span>
          )}

        </button>

      </div>

    </div>
  );


  // ====================================================
  // RENDER
  // ====================================================

  return (
    <div className="min-h-screen bg-[#070b14] text-white">


      {/* ==================================================
          DESKTOP SIDEBAR
      ================================================== */}

      <aside className="fixed inset-y-0 left-0 z-50 hidden w-[270px] border-r border-white/[0.06] bg-[#0b101b] lg:block">

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

        <div className="absolute right-3 top-4 z-10">

          <button
            type="button"
            onClick={() =>
              setMobileSidebarOpen(false)
            }
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.05] text-sm text-slate-400 hover:bg-white/[0.1] hover:text-white"
          >
            ×
          </button>

        </div>

        <SidebarContent />

      </aside>


      {/* ==================================================
          MAIN AREA
      ================================================== */}

      <div className="min-h-screen lg:pl-[270px]">


        {/* =================================================
            HEADER
        ================================================= */}

        <header className="sticky top-0 z-40 h-[76px] border-b border-white/[0.06] bg-[#070b14]/85 backdrop-blur-2xl">

          <div className="flex h-full items-center justify-between px-4 sm:px-6 lg:px-8">


            {/* LEFT */}

            <div className="flex min-w-0 items-center gap-3">

              {/* Mobile Menu */}

              <button
                type="button"
                onClick={() =>
                  setMobileSidebarOpen(true)
                }
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.035] text-slate-400 hover:bg-white/[0.07] hover:text-white lg:hidden"
              >
                ☰
              </button>


              <div className="min-w-0">

                <div className="flex items-center gap-2">

                  <h2 className="truncate text-base font-bold tracking-tight text-white sm:text-lg">
                    {currentPage.name}
                  </h2>

                  <span className="hidden rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-400 sm:inline-flex">
                    LIVE
                  </span>

                </div>

                <p className="mt-0.5 hidden truncate text-[11px] text-slate-500 sm:block">
                  {currentPage.description}
                </p>

              </div>

            </div>


            {/* RIGHT */}

            <div className="flex items-center gap-2 sm:gap-3">


              {/* Search */}

              <button
                type="button"
                className="hidden h-10 items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 text-slate-500 transition hover:border-white/10 hover:bg-white/[0.05] hover:text-slate-300 md:flex"
              >

                <span className="text-sm">
                  ⌕
                </span>

                <span className="text-xs">
                  Search CRM
                </span>

                <kbd className="ml-3 rounded-md border border-white/[0.08] px-1.5 py-0.5 text-[9px] text-slate-600">
                  ⌘ K
                </kbd>

              </button>


              {/* Notification */}

              <button
                type="button"
                className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025] text-sm text-slate-400 transition hover:bg-white/[0.07] hover:text-white"
                aria-label="Notifications"
              >

                🔔

                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-blue-500 shadow shadow-blue-500/60" />

              </button>


              {/* Divider */}

              <div className="hidden h-7 w-px bg-white/[0.07] sm:block" />


              {/* Header User */}

              <button
                type="button"
                onClick={() =>
                  navigate("/dashboard")
                }
                className="flex items-center gap-2 rounded-xl px-1.5 py-1.5 transition hover:bg-white/[0.05]"
              >

                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 text-[11px] font-bold shadow-md shadow-blue-500/10">
                  {initials}
                </div>

                <div className="hidden text-left sm:block">

                  <p className="max-w-[120px] truncate text-xs font-bold text-white">
                    {userName}
                  </p>

                  <p className="text-[9px] text-slate-500">
                    {userRole}
                  </p>

                </div>

              </button>

            </div>

          </div>

        </header>


        {/* =================================================
            PAGE CONTENT
        ================================================= */}

        <main className="min-h-[calc(100vh-76px)]">

          <div className="p-4 sm:p-6 lg:p-8">

            <Outlet />

          </div>

        </main>


        {/* =================================================
            FOOTER
        ================================================= */}

        <footer className="border-t border-white/[0.05] px-4 py-5 sm:px-6 lg:px-8">

          <div className="flex flex-col items-center justify-between gap-2 text-[10px] text-slate-600 sm:flex-row">

            <p>
              © {new Date().getFullYear()} ReadyTech Solutions. All rights reserved.
            </p>

            <div className="flex items-center gap-4">

              <span>
                ReadyTech CRM
              </span>

              <span className="h-1 w-1 rounded-full bg-slate-700" />

              <span>
                v1.0.0
              </span>

            </div>

          </div>

        </footer>

      </div>

    </div>
  );
}