import React, { useEffect, useState } from "react";
import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  ArrowRight,
  BarChart3,
  Eye,
  EyeOff,
  Headphones,
  LayoutDashboard,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";

import API from "../services/api";
import companyLogo from "../assets/Rtech-logo.png";

// ============================================================
// CONFIGURATION
// ============================================================

const DEFAULT_REDIRECT = "/dashboard";

// ============================================================
// TOKEN HELPERS
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
// CLEAR AUTH STORAGE
// ============================================================

const clearAuthStorage = () => {
  const keys = [
    "accessToken",
    "token",
    "access_token",
    "refreshToken",
    "refresh_token",
    "user",
  ];

  keys.forEach((key) => {
    localStorage.removeItem(key);
  });
};

// ============================================================
// LOGIN PAGE
// ============================================================

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  // ==========================================================
  // STATE
  // ==========================================================

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] =
    useState(false);

  const [rememberMe, setRememberMe] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  // ==========================================================
  // EXISTING SESSION CHECK
  // ==========================================================

  useEffect(() => {
    const token = getAccessToken();

    if (!token) {
      return;
    }

    const redirectPath =
      location.state?.from?.pathname ||
      DEFAULT_REDIRECT;

    navigate(redirectPath, {
      replace: true,
    });
  }, [navigate, location.state]);

  // ==========================================================
  // HANDLE INPUT
  // ==========================================================

  const handleChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (error) {
      setError("");
    }
  };

  // ==========================================================
  // LOGIN
  // ==========================================================

  const handleLogin = async (event) => {
    event.preventDefault();

    if (loading) {
      return;
    }

    setError("");

    const email =
      form.email.trim().toLowerCase();

    const password =
      form.password;

    // ========================================================
    // VALIDATION
    // ========================================================

    if (!email) {
      setError(
        "Please enter your work email."
      );
      return;
    }

    // Correct email validation
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError(
        "Please enter a valid email address."
      );
      return;
    }

    if (!password) {
      setError(
        "Please enter your password."
      );
      return;
    }

    if (password.length < 6) {
      setError(
        "Password must contain at least 6 characters."
      );
      return;
    }

    // ========================================================
    // LOGIN REQUEST
    // ========================================================

    try {
      setLoading(true);

      // ------------------------------------------------------
      // Clear old authentication data
      // ------------------------------------------------------
      //
      // IMPORTANT:
      // Refresh token is NOT manually managed here.
      //
      // Backend stores it in an HTTP-only cookie.
      //
      // ------------------------------------------------------

      clearAuthStorage();

      const response = await API.post(
        "/auth/login",
        {
          email,
          password,
        }
      );

      console.log(
        "CRM LOGIN RESPONSE:",
        response?.data
      );

      // ======================================================
      // NORMALIZE RESPONSE
      // ======================================================

      const responseData =
        response?.data || {};

      const payload =
        responseData?.data &&
        typeof responseData.data === "object"
          ? responseData.data
          : responseData;

      // ======================================================
      // ACCESS TOKEN
      // ======================================================

      const accessToken =
        payload?.accessToken ||
        payload?.access_token ||
        payload?.token;

      // ======================================================
      // USER
      // ======================================================

      const user =
        payload?.user ||
        payload?.profile ||
        null;

      console.log(
        "Access token received:",
        Boolean(accessToken)
      );

      // ======================================================
      // ACCESS TOKEN REQUIRED
      // ======================================================

      if (!accessToken) {
        console.error(
          "Authentication token missing.",
          responseData
        );

        throw new Error(
          "Login succeeded, but authentication token was not received."
        );
      }

      // ======================================================
      // CLEAN ACCESS TOKEN
      // ======================================================

      const cleanAccessToken =
        String(accessToken)
          .replace(/^Bearer\s+/i, "")
          .trim();

      if (!cleanAccessToken) {
        throw new Error(
          "Invalid authentication token received from server."
        );
      }

      // ======================================================
      // SAVE ACCESS TOKEN
      // ======================================================
      //
      // Canonical token:
      // accessToken
      //
      // api.js reads this value.
      //
      // ======================================================

      localStorage.setItem(
        "accessToken",
        cleanAccessToken
      );

      // ======================================================
      // DO NOT STORE REFRESH TOKEN
      // ======================================================
      //
      // Backend sends refreshToken as HTTP-only cookie.
      //
      // We intentionally do NOT do:
      //
      // localStorage.setItem("refreshToken", ...)
      //
      // ======================================================

      localStorage.removeItem(
        "refreshToken"
      );

      localStorage.removeItem(
        "refresh_token"
      );

      // ======================================================
      // SAVE USER
      // ======================================================

      if (user) {
        localStorage.setItem(
          "user",
          JSON.stringify(user)
        );
      }

      // ======================================================
      // REMEMBER ME
      // ======================================================

      if (rememberMe) {
        localStorage.setItem(
          "rememberMe",
          "true"
        );
      } else {
        localStorage.removeItem(
          "rememberMe"
        );
      }

      // ======================================================
      // VERIFY TOKEN WAS SAVED
      // ======================================================

      const savedToken =
        localStorage.getItem(
          "accessToken"
        );

      if (!savedToken) {
        throw new Error(
          "Authentication token could not be saved."
        );
      }

      console.log(
        "CRM AUTHENTICATION SUCCESS"
      );

      // ======================================================
      // REDIRECT
      // ======================================================

      const redirectPath =
        location.state?.from?.pathname ||
        DEFAULT_REDIRECT;

      navigate(
        redirectPath,
        {
          replace: true,
        }
      );
    } catch (error) {
      // ======================================================
      // LOGIN ERROR
      // ======================================================

      console.error(
        "CRM LOGIN ERROR:",
        error
      );

      // ------------------------------------------------------
      // Clear invalid session
      // ------------------------------------------------------

      clearAuthStorage();

      // ======================================================
      // RESPONSE DETAILS
      // ======================================================

      const status =
        error?.response?.status;

      const responseData =
        error?.response?.data;

      console.error(
        "CRM LOGIN STATUS:",
        status
      );

      console.error(
        "CRM LOGIN RESPONSE DATA:",
        responseData
      );

      // ======================================================
      // BACKEND ERROR MESSAGE
      // ======================================================

      const backendMessage =
        responseData?.message ||
        responseData?.error?.message ||
        (
          typeof responseData?.error ===
          "string"
            ? responseData.error
            : null
        ) ||
        error?.crmMessage ||
        error?.message;

      // ======================================================
      // ERROR HANDLING
      // ======================================================

      if (status === 400) {
        setError(
          backendMessage ||
            "Please check your login details."
        );
        return;
      }

      if (status === 401) {
        setError(
          backendMessage ||
            "Invalid email or password."
        );
        return;
      }

      if (status === 403) {
        setError(
          backendMessage ||
            "Access denied. Your account may be inactive or restricted."
        );
        return;
      }

      if (status === 404) {
        setError(
          "Login endpoint was not found. Please verify your CRM API configuration."
        );
        return;
      }

      if (status === 422) {
        setError(
          backendMessage ||
            "Please provide valid login information."
        );
        return;
      }

      if (status >= 500) {
        setError(
          "CRM server error. Please try again later."
        );
        return;
      }

      if (
        error?.code ===
        "ERR_NETWORK"
      ) {
        setError(
          "Unable to connect to the CRM server. Please make sure the backend server is running."
        );
        return;
      }

      setError(
        backendMessage ||
          "Unable to sign in. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div className="min-h-screen overflow-hidden bg-[#f7f8fc] text-slate-900">

      {/* ======================================================
          BACKGROUND
      ====================================================== */}

      <div className="fixed inset-0 pointer-events-none">

        <div className="absolute rounded-full w-[520px] h-[520px] bg-indigo-200/30 blur-3xl -top-52 -left-52" />

        <div className="absolute rounded-full w-[520px] h-[520px] bg-purple-200/30 blur-3xl -bottom-52 -right-52" />

        <div className="absolute inset-0 opacity-[0.025] bg-[linear-gradient(to_right,#64748b_1px,transparent_1px),linear-gradient(to_bottom,#64748b_1px,transparent_1px)] bg-[size:40px_40px]" />

      </div>

      {/* ======================================================
          APP
      ====================================================== */}

      <main className="relative z-10 flex min-h-screen">

        {/* ====================================================
            BRAND PANEL
        ==================================================== */}

        <section className="relative hidden overflow-hidden lg:flex lg:w-[55%] bg-slate-950">

          <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950" />

          <div className="absolute rounded-full w-[600px] h-[600px] bg-indigo-600/20 blur-[140px] -top-64 -left-64" />

          <div className="absolute rounded-full w-[500px] h-[500px] bg-violet-600/20 blur-[140px] -bottom-64 -right-64" />

          <div className="relative z-10 flex flex-col justify-between w-full px-12 py-10 xl:px-20">

            {/* ==================================================
                BRAND
            ================================================== */}

            <div className="flex items-center gap-4">

              <div className="flex items-center justify-center w-12 h-12 overflow-hidden bg-white shadow-xl rounded-xl">

                <img
                  src={companyLogo}
                  alt="ReadyTech CRM"
                  className="object-contain w-full h-full p-1.5"
                />

              </div>

              <div>

                <h2 className="text-lg font-black text-white">

                  ReadyTech

                  <span className="text-indigo-300">
                    CRM
                  </span>

                </h2>

                <p className="text-xs text-slate-400">
                  Customer Relationship Platform
                </p>

              </div>

            </div>

            {/* ==================================================
                HERO
            ================================================== */}

            <div className="max-w-2xl">

              <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-6 text-xs font-semibold text-indigo-200 border rounded-full bg-white/5 border-white/10 backdrop-blur-md">

                <Sparkles
                  size={14}
                  className="text-indigo-300"
                />

                Intelligent CRM Workspace

              </div>

              <h1 className="text-5xl font-black leading-[1.03] tracking-tight text-white xl:text-6xl">

                Everything you need

                <span className="block text-transparent bg-gradient-to-r from-indigo-300 via-violet-300 to-purple-300 bg-clip-text">

                  to grow relationships.

                </span>

              </h1>

              <p className="max-w-xl mt-6 text-base leading-7 text-slate-300 xl:text-lg">

                Centralize your leads, contacts, sales
                pipeline, activities and customer
                relationships in one modern CRM workspace.

              </p>

              {/* ==================================================
                  FEATURES
              ================================================== */}

              <div className="grid grid-cols-2 gap-4 mt-10">

                <FeatureCard
                  icon={<Target size={18} />}
                  title="Lead Management"
                  text="Capture and convert more opportunities."
                />

                <FeatureCard
                  icon={<Users size={18} />}
                  title="Customer 360°"
                  text="Keep every customer relationship connected."
                />

                <FeatureCard
                  icon={<TrendingUp size={18} />}
                  title="Sales Pipeline"
                  text="Track every opportunity from start to close."
                />

                <FeatureCard
                  icon={<BarChart3 size={18} />}
                  title="Business Analytics"
                  text="Understand performance with real-time insights."
                />

              </div>

            </div>

            {/* ==================================================
                BOTTOM
            ================================================== */}

            <div className="flex items-center justify-between pt-6 border-t border-white/10">

              <div>

                <p className="text-xs font-semibold text-white">
                  Built for modern businesses
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  CRM • Sales • Customer Success
                </p>

              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400">

                <ShieldCheck
                  size={15}
                  className="text-emerald-400"
                />

                Secure Platform

              </div>

            </div>

          </div>

        </section>

        {/* ====================================================
            LOGIN PANEL
        ==================================================== */}

        <section className="flex items-center justify-center flex-1 px-5 py-8 sm:px-8">

          <div className="w-full max-w-[450px]">

            {/* ==================================================
                MOBILE BRAND
            ================================================== */}

            <div className="flex items-center gap-3 mb-8 lg:hidden">

              <div className="flex items-center justify-center w-11 h-11 overflow-hidden bg-white border shadow-sm rounded-xl border-slate-200">

                <img
                  src={companyLogo}
                  alt="ReadyTech CRM"
                  className="object-contain w-full h-full p-1.5"
                />

              </div>

              <div>

                <p className="font-black text-slate-900">

                  ReadyTech

                  <span className="text-indigo-600">
                    CRM
                  </span>

                </p>

                <p className="text-xs text-slate-400">
                  Customer Relationship Platform
                </p>

              </div>

            </div>

            {/* ==================================================
                LOGIN CARD
            ================================================== */}

            <div className="relative overflow-hidden bg-white border shadow-[0_25px_80px_rgba(15,23,42,0.10)] rounded-[28px] border-slate-200/80">

              {/* TOP ACCENT */}

              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600" />

              <div className="p-7 sm:p-9">

                {/* ==================================================
                    HEADER
                ================================================== */}

                <div className="mb-8">

                  <div className="flex items-center justify-center w-14 h-14 mb-6 bg-indigo-50 border border-indigo-100 rounded-2xl">

                    <LayoutDashboard
                      size={26}
                      className="text-indigo-600"
                    />

                  </div>

                  <p className="mb-2 text-xs font-bold tracking-[0.18em] text-indigo-600 uppercase">

                    CRM Workspace

                  </p>

                  <h1 className="text-3xl font-black tracking-tight text-slate-900">

                    Welcome back

                  </h1>

                  <p className="mt-2 text-sm leading-6 text-slate-500">

                    Sign in to your CRM workspace and
                    continue managing your business.

                  </p>

                </div>

                {/* ==================================================
                    ERROR
                ================================================== */}

                {error && (
                  <div className="p-4 mb-5 border rounded-2xl border-red-200 bg-red-50">

                    <div className="flex items-start gap-3">

                      <div className="flex items-center justify-center flex-shrink-0 w-7 h-7 text-sm font-bold text-red-600 bg-red-100 rounded-full">

                        !

                      </div>

                      <div>

                        <p className="text-sm font-bold text-red-700">

                          Sign-in unsuccessful

                        </p>

                        <p className="mt-1 text-xs leading-5 text-red-600">

                          {error}

                        </p>

                      </div>

                    </div>

                  </div>
                )}

                {/* ==================================================
                    FORM
                ================================================== */}

                <form
                  onSubmit={handleLogin}
                  noValidate
                  className="space-y-5"
                >

                  {/* ==================================================
                      EMAIL
                  ================================================== */}

                  <div>

                    <label
                      htmlFor="email"
                      className="block mb-2 text-sm font-semibold text-slate-700"
                    >
                      Work email
                    </label>

                    <div className="relative">

                      <Mail
                        size={18}
                        className="absolute text-slate-400 -translate-y-1/2 left-4 top-1/2"
                      />

                      <input
                        id="email"
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder="you@company.com"
                        autoComplete="email"
                        disabled={loading}
                        className="w-full h-12 pl-11 pr-4 text-sm font-medium transition-all border outline-none rounded-xl border-slate-200 bg-slate-50/60 text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 disabled:opacity-60"
                      />

                    </div>

                  </div>

                  {/* ==================================================
                      PASSWORD
                  ================================================== */}

                  <div>

                    <div className="flex items-center justify-between mb-2">

                      <label
                        htmlFor="password"
                        className="text-sm font-semibold text-slate-700"
                      >
                        Password
                      </label>

                      <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600">

                        <ShieldCheck size={13} />

                        Protected

                      </span>

                    </div>

                    <div className="relative">

                      <Lock
                        size={18}
                        className="absolute text-slate-400 -translate-y-1/2 left-4 top-1/2"
                      />

                      <input
                        id="password"
                        name="password"
                        type={
                          showPassword
                            ? "text"
                            : "password"
                        }
                        value={form.password}
                        onChange={handleChange}
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        disabled={loading}
                        className="w-full h-12 pl-11 pr-12 text-sm font-medium transition-all border outline-none rounded-xl border-slate-200 bg-slate-50/60 text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 disabled:opacity-60"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowPassword(
                            (previous) =>
                              !previous
                          )
                        }
                        disabled={loading}
                        aria-label={
                          showPassword
                            ? "Hide password"
                            : "Show password"
                        }
                        className="absolute p-2 -translate-y-1/2 rounded-lg right-2.5 top-1/2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 disabled:opacity-50"
                      >

                        {showPassword ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}

                      </button>

                    </div>

                  </div>

                  {/* ==================================================
                      OPTIONS
                  ================================================== */}

                  <div className="flex items-center justify-between">

                    <label className="flex items-center gap-2 text-sm cursor-pointer text-slate-600">

                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(event) =>
                          setRememberMe(
                            event.target.checked
                          )
                        }
                        disabled={loading}
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />

                      Remember me

                    </label>

                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">

                      <Lock size={13} />

                      Secure login

                    </div>

                  </div>

                  {/* ==================================================
                      SUBMIT
                  ================================================== */}

                  <button
                    type="submit"
                    disabled={
                      loading ||
                      !form.email.trim() ||
                      !form.password
                    }
                    className="group flex items-center justify-center w-full h-12 gap-2 font-bold text-white transition-all duration-200 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 shadow-[0_10px_25px_rgba(79,70,229,0.25)] hover:shadow-[0_15px_35px_rgba(79,70,229,0.32)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                  >

                    {loading ? (
                      <>
                        <span className="w-5 h-5 border-2 border-white rounded-full border-t-transparent animate-spin" />

                        Signing in...
                      </>
                    ) : (
                      <>
                        Sign in to CRM

                        <ArrowRight
                          size={18}
                          className="transition-transform group-hover:translate-x-1"
                        />

                      </>
                    )}

                  </button>

                </form>

                {/* ==================================================
                    TRUST FEATURES
                ================================================== */}

                <div className="grid grid-cols-3 gap-3 pt-6 mt-7 border-t border-slate-100">

                  <TrustItem
                    icon={
                      <ShieldCheck size={16} />
                    }
                    text="Secure"
                  />

                  <TrustItem
                    icon={
                      <Zap size={16} />
                    }
                    text="Fast"
                  />

                  <TrustItem
                    icon={
                      <Headphones size={16} />
                    }
                    text="Support"
                  />

                </div>

              </div>

            </div>

            {/* ==================================================
                FOOTER
            ================================================== */}

            <div className="mt-6 text-center">

              <p className="text-xs text-slate-400">

                © {new Date().getFullYear()} ReadyTech Solutions.
                All rights reserved.

              </p>

              <p className="mt-1 text-[11px] text-slate-300">

                CRM Platform • Secure Business Management

              </p>

            </div>

          </div>

        </section>

      </main>

    </div>
  );
}

// ============================================================
// FEATURE CARD
// ============================================================

function FeatureCard({
  icon,
  title,
  text,
}) {
  return (
    <div className="p-4 transition-all duration-200 border rounded-2xl bg-white/[0.045] border-white/10 backdrop-blur-md hover:bg-white/[0.08]">

      <div className="flex items-center justify-center w-9 h-9 mb-3 text-indigo-300 border rounded-xl bg-indigo-500/10 border-indigo-400/10">

        {icon}

      </div>

      <h3 className="text-sm font-bold text-white">
        {title}
      </h3>

      <p className="mt-1 text-xs leading-5 text-slate-400">
        {text}
      </p>

    </div>
  );
}

// ============================================================
// TRUST ITEM
// ============================================================

function TrustItem({
  icon,
  text,
}) {
  return (
    <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-slate-400">

      <span className="text-indigo-500">
        {icon}
      </span>

      {text}

    </div>
  );
}