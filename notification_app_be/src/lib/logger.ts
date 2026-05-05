/**
 * Logger wrapper - initializes and exports the Log function
 * configured with credentials from environment variables
 */
import { initLogger, Log, logger } from "../../logging_middleware/src";

// Initialize logger with credentials from env
initLogger({
  clientID: process.env.AFFORDMED_CLIENT_ID || "",
  clientSecret: process.env.AFFORDMED_CLIENT_SECRET || "",
  baseURL: process.env.AFFORDMED_BASE_URL || "http://20.207.122.201",
});

export { Log, logger };
export default Log;
