import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

import MainLayout from "./components/layout/MainLayout";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Leads from "./pages/Leads";
import Contacts from "./pages/Contacts";
import Companies from "./pages/Companies";
import Products from "./pages/Products";

// ============================================================
// AUTH HELPERS
// ============================================================

const getAccessToken = () => {
  const token =
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("access_token");

  if (
    !token ||
    token === "null" ||
    token === "undefined"
  ) {
    return null;
  }

  return String(token)
    .replace(/^Bearer\s+/i, "")
    .trim();
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
// PUBLIC LOGIN ROUTE
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

        {/* ==================================================
            PUBLIC ROUTE
        ================================================== */}

        <Route
          path="/login"
          element={<LoginRoute />}
        />

        {/* ==================================================
            PROTECTED CRM ROUTES
        ================================================== */}

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

          {/* Dashboard */}
          <Route
            path="/dashboard"
            element={<Dashboard />}
          />

          {/* Leads */}
          <Route
            path="/leads"
            element={<Leads />}
          />

          {/* Contacts */}
          <Route
            path="/contacts"
            element={<Contacts />}
          />

          {/* Companies */}
          <Route
            path="/companies"
            element={<Companies />}
          />

          {/* Products */}
          <Route
            path="/products"
            element={<Products/>}
          />

        </Route>

        {/* ==================================================
            FALLBACK
        ================================================== */}

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