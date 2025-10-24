// the whole service is one file and that's enough
// da imports
import { schedule } from "node-cron";
import express from "express";
import { config } from "dotenv";
import { connect, startSession } from "mongoose";
import { Pinecone } from "@pinecone-database/pinecone";
import { Schema, model } from "mongoose";

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

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
