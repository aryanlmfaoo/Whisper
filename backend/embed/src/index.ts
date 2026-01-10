// the whole service is one file and that's enough
// da imports
import { schedule } from "node-cron";
import express from "express";
import { config } from "dotenv";
import { connect, startSession } from "mongoose";
import { Pinecone } from "@pinecone-database/pinecone";
import { Schema, model } from "mongoose";
import client from "./redis";

// remove in prod only for dev
config();

// Batch of stuff we're getting
const BATCH_SIZE_LIMIT = 1000;

// env imports
const PORT = process.env.PORT;
const MONGOURI = process.env.MONGO_URI;
const PINECONEAPIKEY = process.env.PINECONE_API_KEY;
const PINECONEHOST = process.env.PINECONE_HOST;

// error handling
if (!PORT) {
  console.error("PORT isn't set up");
  process.exit(1);
}

if (!MONGOURI) {
  console.error("MONGOURI isn't set up");
  process.exit(1);
}
if (!PINECONEAPIKEY) {
  console.error("PINECONEAPIKEY isn't set up");
  process.exit(1);
}
if (!PINECONEHOST) {
  console.error("PINECONEHOST isn't set up");
  process.exit(1);
}

const app = express();
app.use(express.json());

// mongodb connection
connect(MONGOURI).then(() => console.log("Connected to mongo."));

// pinecone setup
const pc = new Pinecone({
  apiKey: PINECONEAPIKEY,
});

// pinecone connection
const pinecone = pc.index("default", PINECONEHOST);

pinecone.describeIndexStats().then((res) => console.log(res));
// schema i copied from post microservice
const dataSchema = new Schema({
  postID: {
    type: String,
    required: true,
  },
  body: {
    type: String,
  },
  operation: {
    type: String,
    required: true,
  },
});

const embedSchema = model("embed", dataSchema);

// deleting posts from pinecone job
schedule("0 */3 * * *", async () => {
  const data = await embedSchema
    .find({ operation: "delete" })
    .limit(BATCH_SIZE_LIMIT);
  if (!data.length) {
    console.error("Couldnt fetch data from mongo.");
    return;
  }

  const session = await startSession();

  try {
    session.startTransaction();
    const idsToDelete = [];

    for (const src of data) {
      idsToDelete.push(src.postID);
      await embedSchema.deleteOne({ postID: src.postID }, { session });
    }

    await pinecone.deleteMany(idsToDelete);
  } catch (e) {
    console.error(e);
    session.abortTransaction();
  } finally {
    session.endSession();
  }
});

// save posts cron job
schedule("* * * * *", async () => {
  const data = await embedSchema
    .find({ operation: "save" })
    .limit(BATCH_SIZE_LIMIT);
  if (!data.length) {
    console.error("Couldnt fetch data from mongo.");
    return;
  }

  const session = await startSession();
  try {
    session.startTransaction();
    const arrayToUpsert = [];
    for (const src of data) {
      if (!src.body) continue;
      arrayToUpsert.push({
        _id: src.postID,
        text: src.body,
        category: "Post",
      });
      await embedSchema.deleteOne({ src }, { session });
    }
    await pinecone.upsertRecords(arrayToUpsert);
    await session.commitTransaction();
  } catch (e) {
    console.error(e);
    await session.abortTransaction();
  } finally {
    session.endSession();
  }
});

// create a user vector whenever a new user signs up.
app.post("/user", async (req, res) => {
  console.time("ok");
  const { id, username, email } = req.body;

  if (!id || !username || !email) {
    return res.status(400).json({ success: false, message: "Invalid Input." });
  }
  let vector = new Array(1024);

  for (let i = 0; i < 1024; i++) {
    vector[i] = Math.random();
  }

  console.log(vector);
  try {
    await pinecone.upsert([
      {
        id: id.trim(),
        values: vector,
        metadata: {
          postsLiked: 0,
          category: "User",
          username,
          email,
        },
      },
    ]);
  } catch (err) {
    if (err instanceof Error) {
      console.error(err);
      return res.status(500).json({ success: false });
    }
  }

  console.timeEnd("ok");
  return res.status(200).json({ success: true });
});

app.post("/like", async (req, res) => {
  try {
    console.log("yippeee");
    const { postid, userid } = req.body;
    console.log("postID :" + postid);
    console.log("userID :" + userid);
    let data = await pinecone.fetch([postid, userid]);
    // let user = await pinecone.fetch([userid]);
    const postVector = data.records[postid].values;
    const userVector = data.records[userid].values;
    console.log("postv :" + postVector);
    console.log("userv :" + userVector);

    // return res.status(200).json({ post: postVector, user: userVector });
    if (
      !data.records[userid].metadata ||
      typeof data.records[userid].metadata.postsLiked !== "number" ||
      !postVector ||
      !userVector
    ) {
      console.log(data.records[userid].metadata);

      return res.status(500).json({ success: false });
    }

    data.records[userid].metadata.postsLiked++;
    console.log(data.records[userid].metadata.postsLiked);

    let learningRate;

    if (data.records[userid].metadata.postsLiked <= 10) {
      learningRate = 0.1;
    } else if (data.records[userid].metadata.postsLiked <= 50) {
      learningRate = 0.05;
    } else if (data.records[userid].metadata.postsLiked <= 200) {
      learningRate = 0.02;
    } else if (data.records[userid].metadata.postsLiked <= 1000) {
      learningRate = 0.01;
    } else {
      learningRate = 0.001;
    }

    let postMinusUser = new Array(1024);
    console.time("ok");
    for (let i = 0; i < postVector.length; i++) {
      console.log(`Index ${i} for len rate\n`);
      postMinusUser[i] = learningRate * (postVector[i] - userVector[i]);
    }

    for (let i = 0; i < 1024; i++) {
      console.log(`Index ${i} for addition\n`);
      userVector[i] += postMinusUser[i];
    }
    console.timeEnd("ok");

    data.records[userid].values = userVector;

    try {
      await pinecone.update({
        id: userid,
        values: userVector,
      });
    } catch (e) {
      console.log("George Harrison lowk goated icl " + e);
    }

    // console.log(post);
    // console.log(user);
    return res.json({ data });
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return res.json({ msg: e });
    }
  }
});

app.delete("/like", async (req, res) => {
  try {
    console.log("yippeee");
    const { postid, userid } = req.body;
    console.log("postID :" + postid);
    console.log("userID :" + userid);
    let data = await pinecone.fetch([postid, userid]);
    // let user = await pinecone.fetch([userid]);
    const postVector = data.records[postid].values;
    const userVector = data.records[userid].values;
    console.log("postv :" + postVector);
    console.log("userv :" + userVector);

    // return res.status(200).json({ post: postVector, user: userVector });
    if (
      !data.records[userid].metadata ||
      typeof data.records[userid].metadata.postsLiked !== "number" ||
      !postVector ||
      !userVector
    ) {
      console.log(data.records[userid].metadata);

      return res.status(500).json({ success: false });
    }

    data.records[userid].metadata.postsLiked++;
    console.log(data.records[userid].metadata.postsLiked);

    let learningRate;

    if (data.records[userid].metadata.postsLiked <= 10) {
      learningRate = 0.1;
    } else if (data.records[userid].metadata.postsLiked <= 50) {
      learningRate = 0.05;
    } else if (data.records[userid].metadata.postsLiked <= 200) {
      learningRate = 0.02;
    } else if (data.records[userid].metadata.postsLiked <= 1000) {
      learningRate = 0.01;
    } else {
      learningRate = 0.001;
    }

    let postMinusUser = new Array(1024);
    console.time("ok");
    for (let i = 0; i < postVector.length; i++) {
      console.log(`Index ${i} for len rate\n`);
      postMinusUser[i] = learningRate * (postVector[i] - userVector[i]);
    }

    for (let i = 0; i < 1024; i++) {
      console.log(`Index ${i} for subtraction\n`);
      userVector[i] += postMinusUser[i];
    }
    console.timeEnd("ok");

    data.records[userid].values = userVector;

    try {
      await pinecone.update({
        id: userid,
        values: userVector,
      });
    } catch (e) {
      console.log("George Harrison lowk goated icl " + e);
    }

    return res.json({ data });
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return res.json({ msg: e });
    }
  }
});

app.get("/feed", async (req, res) => {
  const { id } = req.body;
  const userData = await pinecone.fetch([id]);
  const userVector = userData.records[id].values;
  if (!userVector) {
    return res.status(400).json({ message: "User does not exist." })
  }

  const redisData = await client.get(id);
  if (redisData) {
    const totalArray = JSON.parse(redisData);
    if (totalArray.length <= 20) {
      await client.del(id);
      return res.status(200).json(totalArray);
    } else {
      let topTwentyItems = [];
      for (let i = 0; i < 20; i++) {
        topTwentyItems.push(totalArray[i]);
        totalArray.shift();
      }
      await client.set(id, JSON.stringify(totalArray));
      return res.status(200).json(topTwentyItems);
    }
  }

  const similarPosts = await pinecone.query({
    vector: userVector,
    topK: 1000,
    includeMetadata: true,
    filter: {
      category: { $eq: "Post" },
    },
  });

  let cacheSave: String[] = [];
  for (const src of similarPosts.matches) {
    cacheSave.push(src.id);
  }

  client.set(id, JSON.stringify(cacheSave));
  client.expire(id, 86400);

  return res.status(200).json(cacheSave);
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});