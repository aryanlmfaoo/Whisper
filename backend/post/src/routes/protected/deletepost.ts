import { Router } from "express";
import VerifyToken from "../../helpers/verifytoken";
import { startSession } from "mongoose";
import postSchema from "../../schema/post";
import mongoose from "mongoose";
import commentSchema from "../../schema/comments";
import { driver } from "../../neo";
import embeds from "../../schema/embeds";

const router = Router();

router.delete("/", VerifyToken, async (req, res) => {
  const { id } = req.user;
  const { postID } = req.body;

  if (!id || !postID || typeof id !== "string" || typeof postID !== "string") {
    return res.status(400).json({ success: false, message: "Invalid Input." });
  }

  const Mongosession = await startSession();
  try {
    Mongosession.startTransaction();

    const postDeletion = await postSchema.deleteOne({
      _id: new mongoose.Types.ObjectId(postID.trim()),
      authorId: id.trim(),
    });

    const commentDeletion = await commentSchema.deleteMany({
      postId: postID.trim(),
    });

    const embedDeletion = await embeds.create({
      postID: postID.trim(),
      operation: "delete",
    });

    if (!postDeletion || !commentDeletion || !embedDeletion) {
      await Mongosession.abortTransaction();
      await Mongosession.endSession();
      return res
        .status(500)
        .json({ success: false, message: "Internal Server Error." });
    }

    const { records, summary } = await driver.executeQuery(
      `MATCH (a:Post {postID : $postID})
        DETACH DELETE a
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
    Mongosession.abortTransaction();
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error." });
  } finally {
    Mongosession.endSession();
  }
});

export default router;
