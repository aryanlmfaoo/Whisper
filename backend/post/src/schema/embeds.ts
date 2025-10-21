import { Schema, model } from "mongoose";

const embedSchema = new Schema({
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

export default model("embed", embedSchema);
