import { API_URL } from "@/lib/constants";
import { clearSession, getToken, setSession, updateStoredUser } from "@/lib/auth";
import { extractFilename } from "@/lib/utils";

const DEFAULT_TIMEOUT_MS = 30000;
const GENERATE_TIMEOUT_MS = 120000;
const ADMIN_AI_VALIDATE_TIMEOUT_MS = 30000;

class ApiError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "ApiError";
    this.status = options.status;
    this.errorCode = options.errorCode || null;
    this.userMessage = options.userMessage || message;
    this.actions = options.actions || [];
    this.payload = options.payload || null;
  }
}

function buildUrl(path, query = {}) {
  const url = new URL(path, API_URL);

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
}

async function parseJsonResponse(response) {
  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    return null;
  }

  return response.json();
}

function getAbortMessage() {
  return "Request terlalu lama diproses. Silakan coba lagi, gunakan Mode Ringkas, atau periksa koneksi backend.";
}

function createTimeoutSignal(timeoutMs) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => {
    controller.abort(new DOMException("Request timed out", "AbortError"));
  }, timeoutMs);

  return {
    signal: controller.signal,
    clear: () => window.clearTimeout(timeoutId),
  };
}

async function requestJson(path, options = {}) {
  const token = getToken();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const { signal, clear } = createTimeoutSignal(timeoutMs);
  let response;

  try {
    response = await fetch(buildUrl(path), {
      ...options,
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      cache: "no-store",
      signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new ApiError(getAbortMessage(), {
        status: 408,
        payload: { error_code: "REQUEST_TIMEOUT" },
      });
    }

    throw error;
  } finally {
    clear();
  }

  const payload = await parseJsonResponse(response);

  if (!response.ok) {
    if (payload?.error_code === "AUTH_REQUIRED") {
      clearSession();
    }

    throw new ApiError(
      payload?.user_message || payload?.message || "Permintaan ke server gagal.",
      {
        status: response.status,
        errorCode: payload?.error_code,
        userMessage: payload?.user_message,
        actions: payload?.actions,
        payload,
      },
    );
  }

  return payload;
}

async function requestFormData(path, formData, options = {}) {
  const token = getToken();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const { signal, clear } = createTimeoutSignal(timeoutMs);
  let response;

  try {
    response = await fetch(buildUrl(path), {
      ...options,
      method: options.method || "POST",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      body: formData,
      cache: "no-store",
      signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new ApiError(getAbortMessage(), {
        status: 408,
        payload: { error_code: "REQUEST_TIMEOUT" },
      });
    }

    throw error;
  } finally {
    clear();
  }

  const payload = await parseJsonResponse(response);

  if (!response.ok) {
    if (payload?.error_code === "AUTH_REQUIRED") {
      clearSession();
    }

    throw new ApiError(
      payload?.user_message || payload?.message || "Permintaan ke server gagal.",
      {
        status: response.status,
        errorCode: payload?.error_code,
        userMessage: payload?.user_message,
        actions: payload?.actions,
        payload,
      },
    );
  }

  return payload;
}

export async function generateContent(type, payload) {
  return requestJson(`/api/generate/${type}`, {
    method: "POST",
    body: JSON.stringify(payload),
    timeoutMs: GENERATE_TIMEOUT_MS,
  });
}

export async function getHistory(params = {}) {
  const queryString = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      queryString.set(key, String(value));
    }
  });

  const path = queryString.toString()
    ? `/api/history?${queryString.toString()}`
    : `/api/history`;

  return requestJson(path, {
    method: "GET",
  });
}

export async function getHistoryDetail(id) {
  return requestJson(`/api/history/${id}`, {
    method: "GET",
  });
}

export async function deleteHistoryItem(id) {
  return requestJson(`/api/history/${id}`, {
    method: "DELETE",
  });
}

export async function downloadHistoryMarkdown(id) {
  if (!id) {
    throw new Error("ID hasil generate tidak ditemukan untuk proses unduh.");
  }

  const token = getToken();
  const { signal, clear } = createTimeoutSignal(DEFAULT_TIMEOUT_MS);
  let response;

  try {
    response = await fetch(buildUrl(`/api/download/${id}`), {
      method: "GET",
      headers: {
        Accept: "text/markdown, application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: "no-store",
      signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(getAbortMessage());
    }

    throw error;
  } finally {
    clear();
  }

  if (!response.ok) {
    let message = "Gagal mengunduh file Markdown.";

    try {
      const payload = await response.json();
      if (payload?.error_code === "AUTH_REQUIRED") {
        clearSession();
      }
      message = payload?.message || message;
    } catch {
      // Ignore JSON parsing failure for file responses.
    }

    throw new Error(message);
  }

  const blob = await response.blob();
  const filename = extractFilename(response.headers);
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(objectUrl);
}

export async function getTeamMembers() {
  return requestJson(`/api/team-members`, {
    method: "GET",
  });
}

export async function registerUser(payload) {
  const response = await requestJson(`/api/auth/register`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (response?.token && response?.user) {
    setSession(response.token, response.user);
  }

  return response;
}

export async function loginUser(payload) {
  const response = await requestJson(`/api/auth/login`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (response?.token && response?.user) {
    setSession(response.token, response.user);
  }

  return response;
}

export async function forgotPassword(email) {
  return requestJson(`/api/auth/forgot-password`, {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(payload) {
  return requestJson(`/api/auth/reset-password`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createSupportMessage(payload) {
  return requestJson(`/api/support/messages`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createSupportConversation(payload) {
  return requestJson(`/api/support/conversations`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getSupportConversationMessages(id, params = {}) {
  const queryString = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      queryString.set(key, String(value));
    }
  });

  const path = queryString.toString()
    ? `/api/support/conversations/${id}/messages?${queryString.toString()}`
    : `/api/support/conversations/${id}/messages`;

  return requestJson(path, {
    method: "GET",
  });
}

export async function sendSupportConversationMessage(id, payload) {
  return requestJson(`/api/support/conversations/${id}/messages`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getCurrentUser() {
  return requestJson(`/api/auth/me`, {
    method: "GET",
  });
}

export async function getProfile() {
  return requestJson(`/api/profile`, {
    method: "GET",
  });
}

export async function updateProfile(payload) {
  const response = await requestJson(`/api/profile`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  if (response?.data) {
    updateStoredUser(response.data);
  }

  return response;
}

export async function updateProfileName(payload) {
  const response = await requestJson(`/api/profile/name`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  if (response?.data) {
    updateStoredUser(response.data);
  }

  return response;
}

export async function updatePassword(payload) {
  return requestJson(`/api/profile/password`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function uploadProfileAvatar(file) {
  const formData = new FormData();
  formData.append("avatar", file);

  const response = await requestFormData(`/api/profile/avatar`, formData, {
    method: "POST",
    timeoutMs: DEFAULT_TIMEOUT_MS,
  });

  if (response?.data) {
    updateStoredUser(response.data);
  }

  return response;
}

export async function logoutUser() {
  try {
    return await requestJson(`/api/auth/logout`, {
      method: "POST",
    });
  } finally {
    clearSession();
  }
}

export async function createTokenResetRequest(payload) {
  return requestJson(`/api/token-reset-requests`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getMyTokenResetRequests() {
  return requestJson(`/api/token-reset-requests/my`, {
    method: "GET",
  });
}

export async function getAdminTokenResetRequests() {
  return requestJson(`/api/admin/token-reset-requests`, {
    method: "GET",
  });
}

export async function updateAdminTokenResetRequest(id, payload) {
  return requestJson(`/api/admin/token-reset-requests/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function getAdminAiSettings() {
  return requestJson(`/api/admin/ai-settings`, {
    method: "GET",
  });
}

export async function adminGetSupportMessages(params = {}) {
  const queryString = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      queryString.set(key, String(value));
    }
  });

  const path = queryString.toString()
    ? `/api/admin/support/messages?${queryString.toString()}`
    : `/api/admin/support/messages`;

  return requestJson(path, {
    method: "GET",
  });
}

export async function adminGetSupportMessage(id) {
  return requestJson(`/api/admin/support/messages/${id}`, {
    method: "GET",
  });
}

export async function adminReplySupportMessage(id, payload) {
  return requestJson(`/api/admin/support/messages/${id}/reply`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function adminCloseSupportMessage(id) {
  return requestJson(`/api/admin/support/messages/${id}/close`, {
    method: "PATCH",
  });
}

export async function adminGetSupportConversations(params = {}) {
  const queryString = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      queryString.set(key, String(value));
    }
  });

  const path = queryString.toString()
    ? `/api/admin/support/conversations?${queryString.toString()}`
    : `/api/admin/support/conversations`;

  return requestJson(path, {
    method: "GET",
  });
}

export async function adminGetSupportConversation(id) {
  return requestJson(`/api/admin/support/conversations/${id}`, {
    method: "GET",
  });
}

export async function adminSendSupportConversationMessage(id, payload) {
  return requestJson(`/api/admin/support/conversations/${id}/messages`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function adminCloseSupportConversation(id) {
  return requestJson(`/api/admin/support/conversations/${id}/close`, {
    method: "PATCH",
  });
}

export async function adminReopenSupportConversation(id) {
  return requestJson(`/api/admin/support/conversations/${id}/reopen`, {
    method: "PATCH",
  });
}

export async function getAdminAiDiagnostics() {
  return requestJson(`/api/admin/ai-settings/diagnostics`, {
    method: "GET",
  });
}

export async function validateAdminAiKey(payload) {
  return requestJson(`/api/admin/ai-settings/validate-key`, {
    method: "POST",
    body: JSON.stringify(payload),
    timeoutMs: ADMIN_AI_VALIDATE_TIMEOUT_MS,
  });
}

export async function updateAdminAiKey(payload) {
  return requestJson(`/api/admin/ai-settings/update-key`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function adminGetUsers(params = {}) {
  const queryString = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      queryString.set(key, String(value));
    }
  });

  const path = queryString.toString()
    ? `/api/admin/users?${queryString.toString()}`
    : `/api/admin/users`;

  return requestJson(path, {
    method: "GET",
  });
}

export async function adminGetUser(id) {
  return requestJson(`/api/admin/users/${id}`, {
    method: "GET",
  });
}

export async function adminUpdateUser(id, payload) {
  return requestJson(`/api/admin/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function adminResetUserPassword(id, payload) {
  return requestJson(`/api/admin/users/${id}/password`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function adminUpdateUserTokens(id, payload) {
  return requestJson(`/api/admin/users/${id}/tokens`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function adminGetUserLogs(id) {
  return requestJson(`/api/admin/users/${id}/logs`, {
    method: "GET",
  });
}
