// did check this after adding comment node
import { Router } from "express";
import VerifyToken from "../../helpers/verifytoken";
import commentSchema from "../../schema/comments";
import { startSession, Types } from "mongoose";
import { driver } from "../../neo";
import postSchema from "../../schema/post";

const router = Router();

router.post("/", VerifyToken, async (req, res) => {
  const { id } = req.user;
  const { postId, body } = req.body;

  if (
    !id ||
    !postId ||
    !body ||
    typeof id !== "string" ||
    typeof postId !== "string" ||
    typeof body !== "string"
  ) {
    return res.status(400).json({ success: false, message: "Invalid Input." });
  }
  const session = await startSession();
  try {
    session.startTransaction();
    const post = await postSchema.findOne({
      _id: new Types.ObjectId(postId.trim()),
    });

    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Couldn't find post." });
    }

    post.comments++;

    await post.save({ session });

    const _id = new Types.ObjectId();
    await commentSchema.create(
      [
        {
          _id,
          postId: postId.trim(),
          authorId: id.trim(),
          body: body.trim(),
        },
      ],
      { session },
    );

    await driver.executeQuery(
      `
        MATCH (a:User {userId: $id})
        MATCH (b:Post {postID : $postId})
        WITH a, b
        CREATE (c:Comment {commentID: $commentID})
        CREATE (a)-[:COMMENTED]->(c)-[:ON]->(b)
          `,
      {
        id: id.trim(),
        postId: postId.trim(),
        commentID: String(_id),
      },
    );

    await session.commitTransaction();
    return res.status(201).json({ success: true });
  } catch (e) {
    await session.abortTransaction();
    console.error(e);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error." });
  } finally {
    await session.endSession();
  }
});

router.delete("/", VerifyToken, async (req, res) => {
  const { id } = req.user;
  const { postID, commentID } = req.body;

  if (!id || !postID || typeof id !== "string" || typeof postID !== "string") {
    return res.status(400).json({ success: false, message: "Invalid Input." });
  }

  const session = await startSession();
  session.startTransaction();

  try {
    const post = await postSchema.findOne({
      id: new Types.ObjectId(postID.trim()),
    });

    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Couldn't find post." });
    }

    post.comments--;

    await post.save({ session });

    await commentSchema.findOneAndDelete(
      {
        postId: postID.trim(),
        authorId: id.trim(),
        _id: new Types.ObjectId(commentID),
      },
      { session },
    );

    const neoQuery = await driver.executeQuery(
      `
        MATCH (a:User {userId : $id})-[r:COMMENTED]->(b:Comment {commentID: $commentID})-[:ON]->(c:Post {postID : $postID})
        DETACH DELETE b
        RETURN r
        `,
      { id: id.trim(), postID: postID.trim(), commentID: commentID.trim() },
    );

    if (!neoQuery) {
      await session.abortTransaction();
      return res
        .status(500)
        .json({ success: false, message: "Couldn't delete comment." });
    }

    await session.commitTransaction();
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error." });
  } finally {
    session.endSession();
  }
});

export default router;
