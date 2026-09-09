import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

import MainLayout from "./components/layout/MainLayout";

// Pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Leads from "./pages/Leads";
import Contacts from "./pages/Contacts";
import Companies from "./pages/Companies";
import Products from "./pages/Products";
import Opportunities from "./pages/Opportunities";
import Quotations from "./pages/Quotations";
import SalesOrders from "./pages/SalesOrders";
import Invoices from "./pages/Invoices";
import Payments from "./pages/Payments";
import Automations from "./pages/Automations";
import Activities from "./pages/Activities";
import Tasks from "./pages/Tasks"
// ============================================================
// AUTH TOKEN HELPER
// ============================================================

const getAccessToken = () => {
  const token =
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("access_token");

  if (!token) {
    return null;
  }

  if (
    token === "null" ||
    token === "undefined" ||
    token === ""
  ) {
    return null;
  }

  return String(token)
    .replace(/^Bearer\s+/i, "")
    .trim() || null;
};

// ============================================================
// PROTECTED ROUTE
// ============================================================

function ProtectedRoute({ children }) {
  const location = useLocation();
  const token = getAccessToken();

  if (!token) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location,
        }}
      />
    );
  }

  return children;
}

// ============================================================
// LOGIN ROUTE
// ============================================================

function LoginRoute() {
  const token = getAccessToken();

  if (token) {
    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }

  return <Login />;
}

// ============================================================
// APP
// ============================================================

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ======================================================
            PUBLIC ROUTES
        ====================================================== */}

        <Route
          path="/login"
          element={<LoginRoute />}
        />

        {/* ======================================================
            PROTECTED ROUTES
        ====================================================== */}

        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >

          {/* Root */}
          <Route
            path="/"
            element={
              <Navigate
                to="/dashboard"
                replace
              />
            }
          />

          {/* ====================================================
              DASHBOARD
          ==================================================== */}

          <Route
            path="/dashboard"
            element={<Dashboard />}
          />

          {/* ====================================================
              CRM
          ==================================================== */}

          <Route
            path="/leads"
            element={<Leads />}
          />

          <Route
            path="/contacts"
            element={<Contacts />}
          />

          <Route
            path="/companies"
            element={<Companies />}
          />

          <Route
            path="/products"
            element={<Products />}
          />

          <Route
            path="/automations"
            element={<Automations />}
          />


<Route
            path="/activities"
            element={<Activities />}
          />

<Route
            path="/tasks"
            element={<Tasks />}
          />


          {/* ====================================================
              SALES
          ==================================================== */}

          <Route
            path="/opportunities"
            element={<Opportunities />}
          />

          <Route
            path="/quotations"
            element={<Quotations />}
          />

          <Route
            path="/sales-orders"
            element={<SalesOrders />}
          />

          <Route
            path="/invoices"
            element={<Invoices />}
          />

          <Route
            path="/payments"
            element={<Payments />}
          />

        </Route>

        {/* ======================================================
            FALLBACK
        ====================================================== */}

        <Route
          path="*"
          element={
            <Navigate
              to="/dashboard"
              replace
            />
          }
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;