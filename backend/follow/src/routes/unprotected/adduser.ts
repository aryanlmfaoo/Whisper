import { Router } from "express";
import { driver } from "../../neo";

const router = Router();

router.post("/", async (req, res) => {
  const { id, username, email } = req.body;

  if (
    !id ||
    !username ||
    !email ||
    typeof id !== "string" ||
    typeof username !== "string" ||
    typeof email !== "string"
  ) {
    return res.status(400).json({ success: true, message: "Invalid Input" });
  }

  try {
    const { records, summary } = await driver.executeQuery(
      `CREATE (a:User {userId : $id, username:$username, email: $email})`,
      {
        id,
        username: username.toLowerCase(),
        email: email.toLowerCase(),
      },
    );
    console.log(records);
    console.log(summary);
  } catch (e) {
    console.error(e);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error." });
  }
  return res.status(201).json({ success: true });
});

export default router;
