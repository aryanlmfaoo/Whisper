import { Router } from "express";
import isEmail from "../../helpers/isEmail";
import prisma from "../../prisma";

const router = Router();

router.post("/", async (req, res) => {
  const { emailOrUsername } = req.body;

  if (!emailOrUsername || typeof emailOrUsername !== "string") {
    return res.status(400).json({ success: false, message: "Invalid Input." });
  }

  let user;
  try {
    if (isEmail(emailOrUsername)) {
      user = await prisma.user.findFirst({ where: { email: emailOrUsername } });
    } else {
      user = await prisma.user.findFirst({
        where: { username: emailOrUsername.toLowerCase() },
      });
    }
  } catch (e) {
    console.error(e);
    return res
      .status(500)
      .json({ success: false, message: "Interval Database Error." });
  }

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User does not exist. Sign Up instead.",
    });
  }

  const uuid = crypto.randomUUID();

  try {
    await prisma.forgotPassword.upsert({
      where: {
        userId: user.id,
      },
      update: {
        userToken: uuid,
        createdAt: Date.now(),
      },
      create: {
        userId: user.id,
        userToken: uuid,
        createdAt: Date.now(),
      },
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error." });
  }

  // email mechanism with sendgrid

  return res.status(200).json({ success: true });
});
