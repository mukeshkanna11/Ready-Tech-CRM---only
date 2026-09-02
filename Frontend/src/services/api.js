import axios from "axios";

// ============================================================
// API CONFIGURATION
// ============================================================

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/api/v1"
).replace(/\/$/, "");

// ============================================================
// AXIOS INSTANCE
// ============================================================

const API = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,

  // IMPORTANT:
  // Required for HTTP-only refreshToken cookie.
  withCredentials: true,

  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// ============================================================
// TOKEN STORAGE KEYS
// ============================================================

const ACCESS_TOKEN_KEYS = [
  "accessToken",
  "token",
  "access_token",
];

// ============================================================
// TOKEN HELPER
// ============================================================

const getAccessToken = () => {
  for (const key of ACCESS_TOKEN_KEYS) {
    const token = localStorage.getItem(key);

    if (
      token &&
      token !== "null" &&
      token !== "undefined"
    ) {
      return String(token)
        .replace(/^Bearer\s+/i, "")
        .trim();
    }
  }

  return null;
};

// ============================================================
// SAVE ACCESS TOKEN
// ============================================================

const saveAccessToken = (token) => {
  if (!token) return;

  const cleanToken = String(token)
    .replace(/^Bearer\s+/i, "")
    .trim();

  if (!cleanToken) return;

  // Use one canonical key.
  localStorage.setItem(
    "accessToken",
    cleanToken
  );

  // Remove old duplicate token keys.
  localStorage.removeItem("token");
  localStorage.removeItem("access_token");
};

// ============================================================
// CLEAR AUTH DATA
// ============================================================

const clearAuthData = () => {
  ACCESS_TOKEN_KEYS.forEach((key) => {
    localStorage.removeItem(key);
  });

  // Refresh token should normally NOT exist here
  // because backend stores it as HTTP-only cookie.
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("refresh_token");

  localStorage.removeItem("user");
};

// ============================================================
// LOGIN / AUTH REQUEST DETECTION
// ============================================================

const isAuthRequest = (url = "") => {
  return (
    url.includes("/auth/login") ||
    url.includes("/auth/register") ||
    url.includes("/auth/refresh")
  );
};

// ============================================================
// REFRESH REQUEST LOCK
// ============================================================
//
// If 10 API requests fail at the same time because the token
// expired, we don't want 10 refresh requests.
//
// Only ONE refresh request runs.
// Other requests wait for the same Promise.
//

let refreshPromise = null;

// ============================================================
// REFRESH ACCESS TOKEN
// ============================================================

const refreshAccessToken = async () => {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      console.log(
        "🔄 Access token expired. Refreshing token..."
      );

      const response = await axios.post(
        `${API_BASE_URL}/auth/refresh`,
        {},
        {
          withCredentials: true,
          timeout: 30000,
          headers: {
            "Content-Type":
              "application/json",
            Accept: "application/json",
          },
        }
      );

      const newAccessToken =
        response?.data?.data?.accessToken ||
        response?.data?.accessToken;

      if (!newAccessToken) {
        throw new Error(
          "Refresh succeeded but no access token was returned."
        );
      }

      saveAccessToken(newAccessToken);

      console.log(
        "✅ Access token refreshed successfully."
      );

      return newAccessToken;
    } catch (refreshError) {
      console.error(
        "❌ Access token refresh failed:",
        refreshError?.response?.data ||
          refreshError?.message ||
          refreshError
      );

      clearAuthData();

      throw refreshError;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

// ============================================================
// REQUEST INTERCEPTOR
// ============================================================

API.interceptors.request.use(
  (config) => {
    const token = getAccessToken();

    if (token) {
      config.headers =
        config.headers || {};

      config.headers.Authorization =
        `Bearer ${token}`;
    }

    // Make sure refresh cookie is sent.
    config.withCredentials = true;

    return config;
  },

  (error) => {
    return Promise.reject(error);
  }
);

// ============================================================
// RESPONSE INTERCEPTOR
// ============================================================

API.interceptors.response.use(
  // ----------------------------------------------------------
  // SUCCESS
  // ----------------------------------------------------------

  (response) => {
    return response;
  },

  // ----------------------------------------------------------
  // ERROR
  // ----------------------------------------------------------

  async (error) => {
    const status =
      error?.response?.status;

    const originalRequest =
      error?.config;

    const responseData =
      error?.response?.data;

    const message =
      responseData?.message ||
      responseData?.error?.message ||
      error?.message ||
      "API request failed.";

    const requestUrl =
      originalRequest?.url || "";

    // ========================================================
    // 401 UNAUTHORIZED
    // ========================================================

    if (status === 401) {
      console.error(
        "Unauthorized API request:",
        requestUrl,
        responseData
      );

      // ------------------------------------------------------
      // AUTH ENDPOINTS
      // ------------------------------------------------------
      //
      // Never try to refresh:
      // - login
      // - register
      // - refresh
      //
      // ------------------------------------------------------

      if (isAuthRequest(requestUrl)) {
        error.crmMessage = message;

        return Promise.reject(error);
      }

      // ------------------------------------------------------
      // PREVENT INFINITE RETRY
      // ------------------------------------------------------

      if (
        originalRequest &&
        originalRequest._retry
      ) {
        console.error(
          "❌ Request already retried after token refresh."
        );

        clearAuthData();

        if (
          window.location.pathname !==
          "/login"
        ) {
          window.location.href =
            "/login";
        }

        error.crmMessage =
          "Session expired. Please login again.";

        return Promise.reject(error);
      }

      // ------------------------------------------------------
      // ONLY REFRESH EXPIRED ACCESS TOKEN
      // ------------------------------------------------------
      //
      // Backend middleware returns:
      //
      // code:
      // "ACCESS_TOKEN_EXPIRED"
      //
      // ------------------------------------------------------

      const errorCode =
        responseData?.code ||
        responseData?.error?.code;

      if (
        errorCode ===
        "ACCESS_TOKEN_EXPIRED"
      ) {
        try {
          originalRequest._retry = true;

          // --------------------------------------------------
          // Get new access token
          // --------------------------------------------------

          const newAccessToken =
            await refreshAccessToken();

          // --------------------------------------------------
          // Update failed request Authorization
          // --------------------------------------------------

          originalRequest.headers =
            originalRequest.headers ||
            {};

          originalRequest.headers.Authorization =
            `Bearer ${newAccessToken}`;

          originalRequest.withCredentials =
            true;

          // --------------------------------------------------
          // Retry original request
          // --------------------------------------------------

          console.log(
            "🔁 Retrying failed API request:",
            requestUrl
          );

          return API(originalRequest);
        } catch (refreshError) {
          console.error(
            "❌ Session refresh failed. Redirecting to login."
          );

          clearAuthData();

          if (
            window.location.pathname !==
            "/login"
          ) {
            window.location.href =
              "/login";
          }

          refreshError.crmMessage =
            "Session expired. Please login again.";

          return Promise.reject(
            refreshError
          );
        }
      }

      // ------------------------------------------------------
      // OTHER 401 ERRORS
      // ------------------------------------------------------
      //
      // Example:
      // INVALID_ACCESS_TOKEN
      // USER_NOT_FOUND
      // AUTH_REQUIRED
      // ACCOUNT_INACTIVE
      //
      // These should NOT blindly refresh.
      // ------------------------------------------------------

      console.error(
        "❌ Authentication failed:",
        errorCode || message
      );

      clearAuthData();

      if (
        window.location.pathname !==
        "/login"
      ) {
        window.location.href =
          "/login";
      }
    }

    // ========================================================
    // NETWORK ERROR
    // ========================================================

    if (
      error?.code ===
      "ERR_NETWORK"
    ) {
      console.error(
        "CRM API Network Error:",
        error
      );
    }

    // ========================================================
    // SERVER ERROR
    // ========================================================

    if (
      status >= 500
    ) {
      console.error(
        "CRM Server Error:",
        responseData
      );
    }

    // ========================================================
    // CUSTOM CRM ERROR MESSAGE
    // ========================================================

    error.crmMessage = message;

    return Promise.reject(error);
  }
);

// ============================================================
// EXPORT
// ============================================================

export default API;