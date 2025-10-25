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

router.delete("/", VerifyToken, async (req, res) => {
  const { toUnfollowThisUser } = req.body;
  const { id } = req.user;

  if (
    !id ||
    !toUnfollowThisUser ||
    typeof id !== "string" ||
    typeof toUnfollowThisUser !== "string"
  ) {
    console.log(id);
    console.log(toUnfollowThisUser);
    return res.status(400).json({ success: false, message: "Invalid User" });
  }
  const session = driver.session();
  const txn = session.beginTransaction();
  try {
    await txn.run(
      `
    MATCH (a:User {userId:$id})-[r:FOLLOWS]->(b:User {userId:$toUnfollowThisUser})
    DELETE r
    `,
      { id, toUnfollowThisUser },
    );

    const result = await axios.post(authUrl, {
      thisUser: id,
      isUnFollowingThisUser: toUnfollowThisUser,
    });

    if (result.data.success === false) {
      await txn.rollback();
      return res
        .status(400)
        .json({ success: false, message: "Could not follow user." });
    }

    await txn.commit();
    return res.status(200).json({ success: true });
  } catch (e) {
    console.log(e);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error." });
  }
});

export default router;
