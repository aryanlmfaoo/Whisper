import { Router } from "express";
import { driver } from "../../neo";
import VerifyToken from "../helpers/verifytoken";

const router = Router();

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
  try {
    await driver.executeQuery(
      `
    MATCH (a:User {userId:$id})-[r:FOLLOWS]->(b:User {userId:$toUnfollowThisUser})
    DELETE r
    `,
      { id, toUnfollowThisUser },
    );
  } catch (e) {
    console.log(e);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error." });
  }

  return res.status(200).json({ success: true });
});

export default router;
