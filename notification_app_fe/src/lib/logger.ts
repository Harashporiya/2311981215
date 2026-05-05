/**
 * Frontend Logger - wraps the logging middleware for frontend use
 */
import { initLogger, Log } from "../../../logging_middleware/src";

// Initialize once
if (typeof window !== "undefined") {
  initLogger({
    clientID: process.env.NEXT_PUBLIC_CLIENT_ID || "",
    clientSecret: process.env.NEXT_PUBLIC_CLIENT_SECRET || "",
    baseURL: process.env.NEXT_PUBLIC_AFFORDMED_BASE_URL || "http://20.207.122.201",
  });
}

export { Log };
export default Log;
