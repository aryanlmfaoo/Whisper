import { Router } from "express";
import VerifyToken from "../../helpers/verifytoken";
import commentSchema from "../../schema/comments";
import { startSession } from "mongoose";
import { driver } from "../../neo";

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

    const newComment = await commentSchema.create(
      [
        {
          postId: postId.trim(),
          authorId: id.trim(),
          body: body.trim(),
        },
      ],
      { session },
    );

    try {
      await driver.executeQuery(
        `
            MATCH (a:User {userId: $id})
            MATCH (b:Post {postID : $postId})
            MERGE (a)-[:COMMENTED_ON]->(b)
          `,
        { id: id.trim(), postId: postId.trim() },
      );
    } catch (e) {
      console.error(e);
      await session.abortTransaction();
      return res
        .status(500)
        .json({ success: false, message: "Internal Server Error." });
    }

    await session.commitTransaction();
    return res.status(201).json({ success: true, newComment });
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

export default router;
