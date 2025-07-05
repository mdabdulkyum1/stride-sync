import { Server } from "http";
import app from "./app";
import config from "./app/config";

// Initialize Firebase first before any other imports
import "./app/config/firebase";

// Import all cron jobs after Firebase initialization
import "./app/jobs/syncActivities";
import "./app/jobs/cleanupJobs";
import "./app/jobs/notificationJobs";
import "./app/jobs/analyticsJobs";

let server: Server;

const main = async () => {
  try {
    server = app.listen(config.port, () => {
      console.log(`🚀 App is listening on port: ${config.port}`);
    });

  } catch (err) {
    console.log(err);
  }
};

main();


const shutdown = () => {
  console.log("🛑 Shutting down servers...");

  if (server) {
    server.close(() => {
      console.log("Servers closed");
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.on("unhandledRejection", () => {
  console.log(`❌ unhandledRejection is detected, shutting down...`);
  shutdown();
});

process.on("uncaughtException", () => {
  console.log(`❌ uncaughtException is detected, shutting down...`);
  shutdown();
});

process.on("SIGTERM", () => {
  console.log("🛑 SIGTERM received");
  shutdown();
});

process.on("SIGINT", () => {
  console.log("🛑 SIGINT received");
  shutdown();
});
