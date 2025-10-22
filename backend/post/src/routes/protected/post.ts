// i did check this file after adding comment nodes so we're chill
import { Router } from "express";
import VerifyToken from "../../helpers/verifytoken";
import postSchema from "../../schema/post";
import commentSchema from "../../schema/comments";
import { startSession, Types } from "mongoose";
import { driver } from "../../neo";
import embedSchema from "../../schema/embeds";

const router = Router();

router.post("/", VerifyToken, async (req, res) => {
  console.time("API CALL");
  const { id } = req.user;
  const { body, mediaLinks } = req.body;

  if (!id || typeof id !== "string" || !body || typeof body !== "string") {
    return res.status(400).json({ success: false, message: "Invalid Input." });
  }

  const session = await startSession();
  session.startTransaction();

  try {
    const _id = new Types.ObjectId();
    const newPost = await postSchema.create(
      [
        {
          _id: _id,
          authorId: id.trim().toLowerCase(),
          body: body.trim(),
          mediaLinks: mediaLinks || [],
        },
      ],
      { session },
    );

    await embedSchema.create(
      [
        {
          postID: String(_id),
          body: body.trim(),
          operation: "save",
        },
      ],
      { session },
    );

    try {
      await driver.executeQuery(` CREATE (a:Post {postID: $id}) RETURN a`, {
        id: String(_id),
      });
    } catch (neoErr) {
      console.error(neoErr);
      await session.abortTransaction();
      res.status(201).json({ success: true, data: newPost[0] });
    }

    await session.commitTransaction();
    res.status(201).json({ success: true, data: newPost[0] });
    console.timeEnd("API CALL");
  } catch (e) {
    console.error(e);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error." });
  } finally {
    session.endSession();
  }
});

router.delete("/", VerifyToken, async (req, res) => {
  const { id } = req.user;
  const { postID } = req.body;

  if (!id || !postID || typeof id !== "string" || typeof postID !== "string") {
    return res.status(400).json({ success: false, message: "Invalid Input." });
  }

  const session = await startSession();
  try {
    session.startTransaction();

    const postDeletion = await postSchema.deleteOne(
      [
        {
          _id: new Types.ObjectId(postID.trim()),
          authorId: id.trim(),
        },
      ],
      session,
    );

    const commentDeletion = await commentSchema.deleteMany(
      [
        {
          postId: postID.trim(),
        },
      ],
      { session },
    );

    const embedDeletion = await embedSchema.create(
      [
        {
          postID: postID.trim(),
          operation: "delete",
        },
      ],
      { session },
    );

    if (!postDeletion || !commentDeletion || !embedDeletion) {
      await session.abortTransaction();
      await session.endSession();
      return res
        .status(500)
        .json({ success: false, message: "Internal Server Error." });
    }

    const { records, summary } = await driver.executeQuery(
      `
      MATCH (p:Post {postID : $postID})
      OPTIONAL MATCH (u:User)-[:COMMENTED]->(c:Comment)-[:ON]->(p)
      DETACH DELETE p, c
        `,
      { postID: postID.trim() },
    );

    if (!summary) {
      console.log("Neo acting up again(Matrix reference).");
      console.log(summary);
      return res
        .status(500)
        .json({ success: false, message: "Internal Server Error." });
    }

    return res.status(200).json({
      success: true,
      data: { postDeletion, commentDeletion, records, summary },
    });
  } catch (e) {
    console.error(e);
    session.abortTransaction();
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error." });
  } finally {
    session.endSession();
  }
});

export default router;
