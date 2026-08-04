function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback for HTTP (non-secure) contexts where crypto.randomUUID is unavailable
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** The anonymous participant identity, persisted per-browser in localStorage. */
export function getVoterToken(): string {
  if (typeof window === "undefined") return "";
  let token = localStorage.getItem("voter_token");
  if (!token) {
    token = generateUUID();
    localStorage.setItem("voter_token", token);
  }
  return token;
}
