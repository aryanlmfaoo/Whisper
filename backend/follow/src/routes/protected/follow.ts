import { Router } from "express";
import { driver } from "../../neo";
import VerifyToken from "../helpers/verifytoken";

const router = Router();

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
  try {
    await driver.executeQuery(
      `
        MATCH (a:User {userId:$id})
        MATCH (b:User {userId:$toFollowThisUser}) 
        WHERE a IS NOT NULL AND b IS NOT NULL
        CREATE (a)-[:FOLLOWS]->(b)
        `,
      { id, toFollowThisUser },
    );
  } catch (e) {
    console.error(e);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error." });
  }

  return res.status(200).json({ success: true });
});

export default router;
