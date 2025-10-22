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

import post from "./routes/protected/post";
import comment from "./routes/protected/comment";
import postLike from "./routes/protected/likepost";
import postDislike from "./routes/protected/dislikepost";

app.use("/post", post);
app.use("/comment", comment);
app.use("/postlike", postLike);
app.use("/postdislike", postDislike);

app.get("/", (req, res) => {
  return res.status(200).json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
