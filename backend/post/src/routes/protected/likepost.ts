import { Router } from "express";
import VerifyToken from "../../helpers/verifytoken";
import postSchema from "../../schema/post";
import { startSession, Types } from "mongoose";
import { driver } from "../../neo";

const router = Router();

router.post("/", VerifyToken, async (req, res) => {
  const { id } = req.user;
  const { postID } = req.body;

  const session = await startSession();
  session.startTransaction();

  try {
    const { records } = await driver.executeQuery(
      `
      MATCH (a:User {userId : $id})
      MATCH (p:Post {postTD : $postID})
      OPTIONAL MATCH (a)-[l:LIKES]->(p)
      RETURN COUNT(l) > 0 as alreadyLiked
      `,
      { id, postID },
    );

    const record = records[0];
    const alreadyLiked = record.get("alreadyLiked");

    console.log(alreadyLiked);

    if (alreadyLiked) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ success: false, message: "User already likes this post" });
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

    postToEdit.likes++;

    const likeQuery = await driver.executeQuery(
      `
            MATCH (a:User {userId: $id})
            MATCH (b:Post {postID : $postID})
            MERGE (a)-[l:LIKES]->(b)
            WITH a,b,l
            OPTIONAL MATCH (a)-[r:DISLIKES]->(b)
            WITH a, b, r,l,  CASE WHEN r IS NULL THEN false ELSE true END AS hadDisliked
            DELETE r
            RETURN l , hadDisliked
    `,
      { id: id.trim(), postID: postID.trim() },
    );

    if (likeQuery.records.length === 0) {
      await session.abortTransaction();
      return res.status(500).json({
        success: false,
        message: "Couldnt like post",
        keys: likeQuery.keys,
        records: likeQuery.records,
        summary: likeQuery.summary,
      });
    }

    if (likeQuery.records[0].get("hadDisliked")) postToEdit.dislikes--;

    await postToEdit.save({ session });

    await session.commitTransaction();

    return res
      .status(201)
      .json({ success: true, message: "Post liked successfully" });
  } catch (error) {
    await session.abortTransaction();
    console.error("Error in liking post:", error);
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
      OPTIONAL MATCH (a)-[l:LIKES]->(p)
      RETURN COUNT(l) > 0 as alreadyLiked
      `,
      { id, postID },
    );

    const record = records[0];
    const alreadyLiked = record.get("alreadyLiked");

    console.log(alreadyLiked);

    if (!alreadyLiked) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ success: false, message: "User does not like this post" });
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

    postToEdit.likes--;

    await postToEdit.save({ session });

    const likeQuery = await driver.executeQuery(
      `
            MATCH (a:User {userId: $id})-[r:LIKES]->(b:Post {postID : $postID})
            DELETE r
            RETURN r
    `,
      { id: id.trim(), postID: postID.trim() },
    );

    if (likeQuery.records.length === 0) {
      await session.abortTransaction();
      return res.status(500).json({
        success: false,
        message: "Couldnt remove like from  post",
        keys: likeQuery.keys,
        records: likeQuery.records,
        summary: likeQuery.summary,
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
