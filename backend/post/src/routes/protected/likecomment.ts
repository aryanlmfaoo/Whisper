// yeah this is good
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
    const commentToEdit = await commentSchema.findOne({
      _id: new Types.ObjectId(postID),
    });

    if (!commentToEdit) {
      await session.abortTransaction();
      return res
        .status(404)
        .json({ success: false, message: "Couldn't find post" });
    }

    commentToEdit.likes++;

    await commentToEdit.save({ session });

    const likeQuery = await driver.executeQuery(
      `
            MATCH (c:Comment {commentID: $commentID})-[:ON]->(p:Post {post: $postID})
            CREATE (a:User {userId: $id})-[l:LIKES]->(c)
            RETURN l
    `,
      { id: id.trim(), commentID: commentID.trim(), postID: postID.trim() },
    );

    if (likeQuery.records.length === 0) {
      await session.abortTransaction();
      return res.status(500).json({
        success: false,
        message: "Couldnt like post",
      });
    }

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

    commentToEdit.likes--;

    await commentToEdit.save({ session });

    const likeQuery = await driver.executeQuery(
      `
            MATCH (u:User {userId: $id})-[l:LIKES]->(c:Comment {commentID : $commentID})-[:ON]->(p:Post {postID: $postID})
            DELETE l
            RETURN l
    `,
      { id: id.trim(), commentID: commentID.trim(), postID: postID.trim() },
    );

    if (likeQuery.records.length === 0) {
      await session.abortTransaction();
      return res.status(500).json({
        success: false,
        message: "Couldnt like comment.",
      });
    }

    await session.commitTransaction();

    return res
      .status(201)
      .json({ success: true, message: "Comment liked successfully." });
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

export default router;
