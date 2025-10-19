import express from "express";
import { config } from "dotenv";
import { connectToNeo } from "./neo";

config();

const app = express();

const PORT = process.env.PORT;

if (!PORT) {
  console.error("PORT is required");
  process.exit(1);
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

connectToNeo().catch((error) => {
  console.log(error);
});

import adduser from "./routes/unprotected/adduser";
import deleteuser from "./routes/unprotected/deleteuser";
import follow from "./routes/protected/follow";
import unfollow from "./routes/protected/unfollow";

app.use("/adduser", adduser);
app.use("/deleteuser", deleteuser);
app.use("/follow", follow);
app.use("/unfollow", unfollow);

app.listen(PORT, () => {
  console.log(`Server started on port: ${PORT}`);
});
