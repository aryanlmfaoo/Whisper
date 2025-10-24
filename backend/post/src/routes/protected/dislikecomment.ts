import { Router } from "express";
import VerifyToken from "../../helpers/verifytoken";
import commentSchema from "../../schema/comments";
import { startSession, Types } from "mongoose";
import { driver } from "../../neo";

const router = Router();

router.post("/", VerifyToken, async (req, res) => {
  const { id } = req.user;
  const { postID, commentID } = req.body;

  if (
    !id ||
    typeof id !== "string" ||
    !postID ||
    typeof postID !== "string" ||
    !commentID ||
    typeof commentID !== "string"
  ) {
    return res.status(400).json({ success: false, message: "Invalid Input." });
  }

  const session = await startSession();
  session.startTransaction();

  try {
    const { records } = await driver.executeQuery(
      `
      MATCH (a:User {userId : $id})
      MATCH (c:Comment {commentID : $commentID})
      OPTIONAL MATCH (a)-[l:DISLIKES]->(c)
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
    const commentToEdit = await commentSchema.findOne({
      _id: new Types.ObjectId(postID),
    });

    if (!commentToEdit) {
      await session.abortTransaction();
      return res
        .status(404)
        .json({ success: false, message: "Couldn't find post" });
    }

    commentToEdit.dislikes++;

    const likeQuery = await driver.executeQuery(
      `
      MATCH (a:User {userId: $id})
      MATCH (c:Comment {commentID: $commentID})-[:ON]->(p:Post {postID: $postID})
      MERGE (a)-[l:DISLIKES]->(c)
      OPTIONAL MATCH (a)-[r:LIKES]->(c)
      WITH l, r, CASE WHEN r IS NULL THEN false ELSE true END AS hadLiked
      DELETE r
      RETURN l, hadLiked;
    `,
      { id: id.trim(), commentID: commentID.trim(), postID: postID.trim() },
    );

    if (likeQuery.records.length === 0) {
      await session.abortTransaction();
      return res.status(500).json({
        success: false,
        message: "Couldnt dislike post",
      });
    }

    if (likeQuery.records[0].get("hadLiked")) commentToEdit.likes--;

    await commentToEdit.save({ session });

    await session.commitTransaction();

    return res
      .status(201)
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
  const { postID, commentID } = req.body;

  if (
    !id ||
    typeof id !== "string" ||
    !postID ||
    typeof postID !== "string" ||
    !commentID ||
    typeof commentID !== "string"
  ) {
    return res.status(400).json({ success: false, message: "Invalid Input." });
  }

  const session = await startSession();
  session.startTransaction();

  try {
    const commentToEdit = await commentSchema.findOne({
      _id: new Types.ObjectId(postID),
    });

    if (!commentToEdit) {
      await session.abortTransaction();
      return res
        .status(404)
        .json({ success: false, message: "Couldn't find post" });
    }

    commentToEdit.dislikes--;

    await commentToEdit.save({ session });

    const likeQuery = await driver.executeQuery(
      `
            MATCH (u:User {userId: $id})-[l:DISLIKES]->(c:Comment {commentID : $commentID})-[:ON]->(p:Post {postID: $postID})
            DELETE l
            RETURN l
    `,
      { id: id.trim(), commentID: commentID.trim(), postID: postID.trim() },
    );

    if (likeQuery.records.length === 0) {
      await session.abortTransaction();
      return res.status(500).json({
        success: false,
        message: "Couldnt dislike comment.",
      });
    }

    await session.commitTransaction();

    return res
      .status(201)
      .json({ success: true, message: "Comment disliked successfully." });
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

export default router;
