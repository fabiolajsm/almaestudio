import { createHmac, timingSafeEqual } from "node:crypto";

const sessionCookieName = "alma_admin_session";
const sessionDurationSeconds = 8 * 60 * 60;

function getSessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;

  if (!secret || Buffer.byteLength(secret) < 32) {
    throw new Error("ADMIN_SESSION_SECRET debe tener al menos 32 bytes.");
  }

  return secret;
}

export function isAdminPasswordConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD);
}

export function isAdminSessionSecretConfigured() {
  return Buffer.byteLength(process.env.ADMIN_SESSION_SECRET ?? "") >= 32;
}

export function createAdminSessionCookie() {
  const expiresAt = Math.floor(Date.now() / 1000) + sessionDurationSeconds;
  const payload = String(expiresAt);
  const signature = createHmac("sha256", getSessionSecret())
    .update(payload)
    .digest("base64url");
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";

  return `${sessionCookieName}=${payload}.${signature}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=${sessionDurationSeconds}${secure}`;
}

export function clearAdminSessionCookie() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";

  return `${sessionCookieName}=; HttpOnly; SameSite=Strict; Path=/api; Max-Age=0${secure}`;
}

export function clearLegacyAdminSessionCookie() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";

  return `${sessionCookieName}=; HttpOnly; SameSite=Strict; Path=/api/admin; Max-Age=0${secure}`;
}

export function isValidAdminPassword(password: string) {
  const expectedPassword = process.env.ADMIN_PASSWORD;
  if (!expectedPassword) {
    return false;
  }

  const expectedDigest = createHmac("sha256", "alma-admin-password")
    .update(expectedPassword)
    .digest();
  const actualDigest = createHmac("sha256", "alma-admin-password")
    .update(password)
    .digest();

  return timingSafeEqual(expectedDigest, actualDigest);
}

export function hasValidAdminSession(request: Request) {
  const cookieHeader = request.headers.get("cookie");
  const cookieValue = cookieHeader
    ?.split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${sessionCookieName}=`))
    ?.slice(sessionCookieName.length + 1);

  if (!cookieValue) {
    return false;
  }

  const separator = cookieValue.indexOf(".");
  if (separator <= 0) {
    return false;
  }

  const payload = cookieValue.slice(0, separator);
  const signature = cookieValue.slice(separator + 1);
  const expiresAt = Number(payload);

  if (!Number.isInteger(expiresAt) || expiresAt <= Date.now() / 1000) {
    return false;
  }

  try {
    const expectedSignature = createHmac("sha256", getSessionSecret())
      .update(payload)
      .digest();
    const suppliedSignature = Buffer.from(signature, "base64url");

    return (
      suppliedSignature.length === expectedSignature.length &&
      timingSafeEqual(suppliedSignature, expectedSignature)
    );
  } catch {
    return false;
  }
}

export function hasSameOrigin(request: Request) {
  const origin = request.headers.get("origin");

  return origin !== null && origin === new URL(request.url).origin;
}
