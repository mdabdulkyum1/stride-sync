import express from 'express';
import router from './app/routes';
import { errorHandler } from './app/middlewares/errorHandler';
import cors from 'cors'

const app = express();


app.use(express.json());
app.use(cors())



app.use("/api/v1", router);


app.get("/", async (req, res) => {
	res.send("Server is running!..");
});
app.get("/health", async (req, res) => {
	res.send("✅ Server Healthy");
});


app.use(errorHandler);

export default app;