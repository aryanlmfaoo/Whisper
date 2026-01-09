import express from "express";
import { config } from "dotenv";

config();

const app = express();

const PORT = Number(process.env.PORT);

if (!PORT) {
  console.log("Port isnt defined in env variables.");
  process.exit(1);
}

import signup from "./routes/unprotected/signup";
import login from "./routes/unprotected/login";
import forgotpasswordreq from "./routes/unprotected/forgotpasswordreq";
import forgotpassword from "./routes/unprotected/forgotpassword";
import deleteaccount from "./routes/protected/deleteaccountreq";

app.use(express.json());

app.use("/signup", signup);
app.use("/login", login);
app.use("/forgotpasswordreq", forgotpasswordreq);
app.use("/forgotpassword", forgotpassword);
app.use("/deleteaccount", deleteaccount)

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Connected to port ${PORT}`);
});
