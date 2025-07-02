import express from 'express';
import router from './app/routes';
import { errorHandler } from './app/middlewares/errorHandler';

const app = express();


app.use(express.json());


app.use("/api/v1", router);


app.get("/", async (req, res) => {
	res.send("Server is running!..");
});

app.use(errorHandler);

export default app;