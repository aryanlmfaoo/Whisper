import { Router } from "express";
import { driver } from "../../neo";
const router = Router();

router.delete("/", async (req, res) => {
  const { id } = req.body;

  if (!id || typeof id !== "string")
    return res.status(400).json({ success: false, message: "Invalid Input." });

  try {
    const { records } = await driver.executeQuery(
      `
        OPTIONAL MATCH (a:User{id:$id})
        RETURN a
    `,
      {
        id: id,
      },
    );
    if (!records)
      return res
        .status(400)
        .json({ success: false, message: "User does not exist" });
  } catch (e) {
    console.error(e);
    return res
      .status(500)
      .json({ success: false, message: "Interval Server Error." });
  }

  const { summary } = await driver.executeQuery(
    `
    MATCH (a:User {id:$id})
    DETACH DELETE a
    `,
    {
      id,
    },
  );

  if (summary.updateStatistics["_stats"].nodesDeleted > 0)
    return res
      .status(200)
      .json({ success: true, message: `User with user id ${id} deleted.` });
});

export default router;
