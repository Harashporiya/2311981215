/**
 * Logging Middleware for Affordmed Campus Hiring Evaluation
 * Reusable logging package for both Backend and Frontend applications
 */

// Types
export type Stack = "backend" | "frontend";
export type Level = "debug" | "info" | "warn" | "error" | "fatal";

// Backend-only packages
export type BackendPackage =
  | "cache"
  | "controller"
  | "cron_job"
  | "handler"
  | "repository"
  | "route"
  | "service";

// Frontend-only packages
export type FrontendPackage =
  | "api"
  | "component"
  | "hook"
  | "page"
  | "state"
  | "style";

// Shared packages
export type SharedPackage = "auth" | "config" | "middleware" | "utils";

export type Package = BackendPackage | FrontendPackage | SharedPackage;

export interface LogPayload {
  stack: Stack;
  level: Level;
  package: Package;
  message: string;
}

export interface LogResponse {
  logID: string;
  message: string;
}

export interface LoggerConfig {
  clientID: string;
  clientSecret: string;
  baseURL?: string;
}

let globalConfig: LoggerConfig | null = null;
let accessToken: string | null = null;
let tokenExpiry: number | null = null;

/**
 * Initialize the logger with client credentials
 */
export function initLogger(config: LoggerConfig): void {
  globalConfig = {
    ...config,
    baseURL: config.baseURL || "http://20.207.122.201",
  };
}

/**
 * Authenticate and get access token
 */
async function getAccessToken(): Promise<string> {
  if (!globalConfig) {
    throw new Error(
      "Logger not initialized. Call initLogger() with your credentials first."
    );
  }

  // Return cached token if still valid (with 60s buffer)
  if (accessToken && tokenExpiry && Date.now() < tokenExpiry - 60000) {
    return accessToken;
  }

  const response = await fetch(
    `${globalConfig.baseURL}/evaluation-service/auth`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clientID: globalConfig.clientID,
        clientSecret: globalConfig.clientSecret,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Authentication failed: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();
  accessToken = data.access_token;
  tokenExpiry = data.expires_in * 1000; // Convert to ms if needed
  return accessToken as string;
}

/**
 * Core Log function - makes API call to the Test Server
 * Log(stack, level, package, message)
 */
export async function Log(
  stack: Stack,
  level: Level,
  pkg: Package,
  message: string
): Promise<LogResponse | null> {
  if (!globalConfig) {
    console.error(
      "[LoggingMiddleware] Logger not initialized. Call initLogger() first."
    );
    return null;
  }

  try {
    const token = await getAccessToken();

    const payload: LogPayload = {
      stack,
      level,
      package: pkg,
      message,
    };

    const response = await fetch(
      `${globalConfig.baseURL}/evaluation-service/logs`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      // If token expired, clear it and retry once
      if (response.status === 401) {
        accessToken = null;
        tokenExpiry = null;
        const newToken = await getAccessToken();

        const retryResponse = await fetch(
          `${globalConfig.baseURL}/evaluation-service/logs`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${newToken}`,
            },
            body: JSON.stringify(payload),
          }
        );

        if (!retryResponse.ok) {
          throw new Error(
            `Log API failed after retry: ${retryResponse.status}`
          );
        }

        return (await retryResponse.json()) as LogResponse;
      }

      throw new Error(`Log API failed: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as LogResponse;
    return result;
  } catch (error) {
    // Silent fail - logging should never crash the application
    console.error("[LoggingMiddleware] Failed to send log:", error);
    return null;
  }
}

/**
 * Convenience helper functions
 */
export const logger = {
  debug: (stack: Stack, pkg: Package, message: string) =>
    Log(stack, "debug", pkg, message),
  info: (stack: Stack, pkg: Package, message: string) =>
    Log(stack, "info", pkg, message),
  warn: (stack: Stack, pkg: Package, message: string) =>
    Log(stack, "warn", pkg, message),
  error: (stack: Stack, pkg: Package, message: string) =>
    Log(stack, "error", pkg, message),
  fatal: (stack: Stack, pkg: Package, message: string) =>
    Log(stack, "fatal", pkg, message),
};

export default Log;
