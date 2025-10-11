import express from "express";
import { config } from "dotenv";

config();

const app = express();

const PORT = Number(process.env.PORT);

if (!PORT) {
  console.log("Port isnt defined in env variables.");
  process.exit(1);
}

import signup from "./routes/unproteted/signup";
import login from "./routes/unproteted/login";

app.use(express.json());

app.use("/signup", signup);
app.use("/login", login);

app.listen(PORT, () => {
  console.log(`Connected to port ${PORT}`);
});
