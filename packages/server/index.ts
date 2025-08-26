import type { Request, Response } from "express";
import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.get("/", (req: Request, res: Response) => {
  res.send(`process.env.OPENAI_API_KEY: ${process.env.OPENAI_API_KEY}`);
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
