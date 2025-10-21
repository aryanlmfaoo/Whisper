import { Schema, model } from "mongoose";

const postSchema = new Schema(
  {
    authorId: {
      type: String,
      required: true,
      index: true,
    },
    body: {
      type: String,
      required: true,
    },
    likes: {
      type: Number,
      default: 0,
    },
    dislikes: {
      type: Number,
      default: 0,
    },
    mediaLinks: {
      type: Array,
    },
    comments: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

export default model("Post", postSchema);
