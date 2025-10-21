import { Router } from "express";
import VerifyToken from "../../helpers/verifytoken";
import postSchema from "../../schema/post";
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

    await embedSchema.create([
      {
        postID: String(_id),
        body: body.trim(),
        operation: "save",
      },
    ]);

    try {
      await driver.executeQuery(` CREATE (a:Post {postID: $id}) RETURN a`, {
        id: String(newPost[0]._id),
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

export default router;
