import express from "express";
import { connect } from "mongoose";
import { config } from "dotenv";
import { connectToNeo } from "./neo";
config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT;
const MONGO_URI = process.env.MONGO_URI;

if (!PORT) {
  console.log("Port isn't set up in .env");
  process.exit(1);
}

if (!MONGO_URI) {
  console.log("Mongo URI isn't set up in .env");
  process.exit(1);
}

connect(MONGO_URI)
  .then(() => console.log("Connected to MongoDb"))
  .catch((err) => {
    console.log("Couldnt connect to MongoDB.");
    console.error(err);
    process.exit(1);
  });

connectToNeo();

import createPost from "./routes/protected/createpost";
import createComment from "./routes/protected/createcomment";
import deletePost from "./routes/protected/deletepost";

app.use("/createpost", createPost);
app.use("/createcomment", createComment);
app.use("/deletepost", deletePost);

app.get("/", (req, res) => {
  return res.status(200).json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
