import { Schema, model } from "mongoose";

const commentSchema = new Schema(
  {
    postId: {
      type: String,
      required: true,
    },
    authorId: {
      type: String,
      required: [true, "authorPfp is required."],
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
  },
  { timestamps: true },
);

export default model("comments", commentSchema);
