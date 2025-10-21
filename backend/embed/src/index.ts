// the whole service is one file and that's enough
// da imports
import { schedule } from "node-cron";
import express from "express";
import { config } from "dotenv";
import { connect } from "mongoose";
import { Pinecone } from "@pinecone-database/pinecone";
import { Schema, model } from "mongoose";

// remove in prod only for dev
config();

// Batch of stuff we're getting
const BATCH_SIZE_LIMIT = 100;

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

// the cron job
schedule("0 */3 * * *", async () => {
  const data = await embedSchema.find().limit(BATCH_SIZE_LIMIT);
  if (!data.length) {
    console.error("Couldnt fetch data from mongo.");
    return;
  }

  for (const src of data) {
    console.log(`Trying to work on postID: ${src.postID}`);
    if (src.operation === "save") {
      // if its a save operation, save it in pinecone and delete the db entry
      console.log(`${src.postID} is a save operation.`);
      if (!src.body) continue;
      try {
        await pinecone.upsertRecords([
          {
            _id: src.postID,
            text: src.body,
            category: "Post",
          },
        ]);
        console.log(`Saved ${src.postID} in pinecone`);
        await embedSchema.deleteOne({ postID: src.postID });
        console.log(`Deleted ${src.postID} from mongo.`);
      } catch (error) {
        console.error(error);
        continue;
      }
    } else if (src.operation === "delete") {
      console.log(`${src.postID} is a delete operation.`);
      try {
        //
        await pinecone.deleteOne(src.postID);
        console.log(`Deleted ${src.postID} from pinecone`);
        await embedSchema.deleteOne({ postID: src.postID });
        console.log(`Deleted ${src.postID} from mongo.`);
      } catch (error) {
        console.error(error);
        continue;
      }
    }
  }
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
