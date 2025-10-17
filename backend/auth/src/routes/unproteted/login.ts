import { Router } from "express";
import jwt from "jsonwebtoken";
import { compare } from "bcrypt";
import isEmail from "../../helpers/isEmail";
import prisma from "../../prisma";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET_KEY;

if (!JWT_SECRET) {
  console.log("jwt secret isnt set up.");
  process.exit(1);
}

router.post("/", async (req, res) => {
  const { emailOrUsername, password } = req.body;
  if (!emailOrUsername || !password) {
    return res.status(400).json({ success: false, message: "Invalid Input." });
  }

  let user;

  try {
    if (isEmail(emailOrUsername)) {
      user = await prisma.user.findFirst({
        where: { email: emailOrUsername.toLowerCase() },
      });
    } else {
      user = await prisma.user.findFirst({
        where: { username: emailOrUsername.toLowerCase() },
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User does not exist. Sign Up instead.",
      });
    }

    const correctPass = await compare(password, user.password);

    if (!correctPass) {
      return res
        .status(403)
        .json({ success: false, message: "Wrong Password." });
    } else {
      const token = jwt.sign(
        { id: user.id, username: user.username },
        JWT_SECRET,
        { expiresIn: "3hr" },
      );
      return res.status(200).json({ success: true, token });
    }
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error." });
  }
});

export default router;
