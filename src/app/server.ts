import { startKeepAlive } from "./services/keepAlive";

// Only start the keep-alive service in production
if (process.env.NODE_ENV === "production") {
  startKeepAlive();
}
