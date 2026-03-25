import { auth } from "./firebase";

const API_URL = "https://oficina-saas-wtc8.onrender.com";

async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("User not authenticated");
  }

  const token = await user.getIdToken();

  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "API request failed");
  }

  return response.json();
}

export const api = {
  setupCompany: (companyName: string) =>
    apiFetch("/setup-company", {
      method: "POST",
      body: JSON.stringify({ companyName }),
    }),

  createClient: (data: any) =>
    apiFetch("/clients", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getClients: () => apiFetch("/clients"),
};