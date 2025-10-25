import { Router } from "express";
import { driver } from "../../neo";
import VerifyToken from "../helpers/verifytoken";
import axios from "axios";

const router = Router();

const authUrl = process.env.AUTH_SERVICE_URL;

if (!authUrl) {
  console.log("auth service url isnt set up in env.");
  process.exit(1);
}

router.post("/", VerifyToken, async (req, res) => {
  const { toFollowThisUser } = req.body;
  const { id } = req.user;

  if (
    !id ||
    !toFollowThisUser ||
    typeof id !== "string" ||
    typeof toFollowThisUser !== "string"
  ) {
    console.log(id);
    console.log(toFollowThisUser);
    return res.status(400).json({ success: false, message: "Invalid User" });
  }

  const session = driver.session();
  const tx = await session.beginTransaction();

  try {
    await tx.run(
      `
        MATCH (a:User {userId:$id})
        MATCH (b:User {userId:$toFollowThisUser}) 
        WHERE a IS NOT NULL AND b IS NOT NULL
        CREATE (a)-[:FOLLOWS]->(b)
        `,
      { id, toFollowThisUser },
    );

    const result = await axios.post(authUrl, {
      thisUser: id,
      isFollowingThisUser: toFollowThisUser,
    });

    if (result.data.success === false) {
      await tx.rollback();
      return res
        .status(400)
        .json({ success: false, message: "Couldn't follow user." });
    }

    await tx.commit();
    return res.status(201).json({ success: true });
  } catch (e) {
    await tx.rollback();
    console.error(e);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error." });
  }
});

export default router;
