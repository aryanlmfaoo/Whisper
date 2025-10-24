// yea this is good
import { Router } from "express";
import VerifyToken from "../../helpers/verifytoken";
import postSchema from "../../schema/post";
import { startSession, Types } from "mongoose";
import { driver } from "../../neo";

const router = Router();

router.post("/", VerifyToken, async (req, res) => {
  const { id } = req.user;
  const { postID } = req.body;

  if (!id || !postID || typeof id !== "string" || typeof postID !== "string") {
    return res.status(400).json({ success: false, message: "Invalid Input." });
  }

  const session = await startSession();
  session.startTransaction();

  try {
    const { records } = await driver.executeQuery(
      `
      MATCH (a:User {userId : $id})
      MATCH (p:Post {postID : $postID})
      OPTIONAL MATCH (a)-[l:DISLIKES]->(p)
      RETURN COUNT(l) > 0 as alreadyDisliked
      `,
      { id, postID },
    );

    const record = records[0];
    const alreadyDisliked = record.get("alreadyDisliked");

    console.log(alreadyDisliked);

    if (alreadyDisliked) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ success: false, message: "User already disliked this post" });
    }

    const postToEdit = await postSchema.findOne({
      _id: new Types.ObjectId(postID),
    });

    if (!postToEdit) {
      await session.abortTransaction();
      return res
        .status(404)
        .json({ success: false, message: "Couldn't find post" });
    }

    postToEdit.dislikes++;

    const likeQuery = await driver.executeQuery(
      `
      MATCH (a:User {userId: $id})
      MATCH (b:Post {postID : $postID})
      MERGE (a)-[r:DISLIKES]->(b)
      WITH a,b,r
      OPTIONAL MATCH (a)-[l:LIKES]->(b)
      WITH l, r, CASE WHEN l IS NULL THEN false ELSE true END AS hadLiked
      DELETE l
      RETURN r, hadLiked
      `,
      { id: id.trim(), postID: postID.trim() },
    );

    if (likeQuery.records[0].get("hadLiked")) postToEdit.likes--;

    await postToEdit.save({ session });

    if (likeQuery.records.length === 0) {
      await session.abortTransaction();
      return res.status(500).json({
        success: false,
        message: "Couldnt dislike post",
      });
    }

    await session.commitTransaction();

    return res
      .status(200)
      .json({ success: true, message: "Post disliked successfully" });
  } catch (error) {
    await session.abortTransaction();
    console.error("Error in disliking post:", error);
    return res
      .status(500)
      .json({ success: false, message: "Something went wrong" });
  } finally {
    session.endSession();
  }
});

router.delete("/", VerifyToken, async (req, res) => {
  const { id } = req.user;
  const { postID } = req.body;

  const session = await startSession();
  session.startTransaction();

  try {
    const { records } = await driver.executeQuery(
      `
      MATCH (a:User {userId : $id})
      MATCH (p:Post {postTD : $postID})
      OPTIONAL MATCH (a)-[l:DISLIKES]->(p)
      RETURN COUNT(l) > 0 as alreadyDisliked
      `,
      { id, postID },
    );

    const alreadyDisliked = records[0].get("alreadyDisliked");

    console.log(alreadyDisliked);

    if (alreadyDisliked) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ success: false, message: "User does not dislike this post" });
    }

    const postToEdit = await postSchema.findOne({
      _id: new Types.ObjectId(postID),
    });

    if (!postToEdit) {
      await session.abortTransaction();
      return res
        .status(404)
        .json({ success: false, message: "Couldn't find post" });
    }

    postToEdit.dislikes--;

    await postToEdit.save({ session });

    const likeQuery = await driver.executeQuery(
      `
            MATCH (a:User {userId: $id})-[r:DISLIKES]->(b:Post {postID : $postID})
            DELETE r
            RETURN r
    `,
      { id: id.trim(), postID: postID.trim() },
    );

    if (likeQuery.records.length === 0) {
      await session.abortTransaction();
      return res.status(500).json({
        success: false,
        message: "Couldnt remove like from post",
      });
    }

    await session.commitTransaction();

    return res
      .status(200)
      .json({ success: true, message: "Removed post liked successfully" });
  } catch (error) {
    await session.abortTransaction();
    console.error("Error in removing like:", error);
    return res
      .status(500)
      .json({ success: false, message: "Something went wrong" });
  } finally {
    session.endSession();
  }
});

export default router;
