import express from 'express';
import path from 'path';
import router from './app/routes';
import { errorHandler } from './app/middlewares/errorHandler';
import cors from 'cors'

const app = express();

app.use(express.json());
app.use(cors());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// API routes
app.use("/api/v1", router);

// Health check
app.get("/health", async (req, res) => {
	res.send("✅ Server Healthy");
});

// Dashboard route (protected)
app.get("/dashboard", async (req, res) => {
	res.send("✅ Dashboard - Login success");
});

// Serve the main page
app.get("/", async (req, res) => {
	res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.use(errorHandler);

export default app;