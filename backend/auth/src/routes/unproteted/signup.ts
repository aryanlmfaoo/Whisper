import { Router } from "express";
import prisma from "../../prisma";
import { genSalt, hash } from "bcrypt";
import jwt from "jsonwebtoken";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET_KEY;

if (!JWT_SECRET) {
  console.log("JWT Key not set");
  process.exit(1);
}

router.post("/", async (req, res) => {
  const { username, password, bio, name, email } = req.body;

  if (!username || !password || !bio || !name) {
    console.log("Invalid Input.");
    return res.status(400).json({ success: false, message: "Invalid Input." });
  }

  try {

    const userExists = await prisma.user.count({
      where: {
        OR: [{ username, email }]
      }
    })

    if (userExists > 0) {
      return res.status(400).json({ success: false, message: "User already exists." })
    }


    const salt = await genSalt(10);
    const hashedPass = await hash(password, salt);

    const user = await prisma.user.create({
      data: {
        username,
        bio,
        name,
        email,
        password: hashedPass,
      }
    });

    const token = jwt.sign({ user: user.id, username }, JWT_SECRET, {
      expiresIn: "3hr",
    });

    /// for other service to create a user instance if required.
    // const creatingInstances = Promise.all([])

    return res.status(201).json({ success: true, token });
  } catch (error) {
    console.error(error);

    await prisma.user
      .delete({
        where: {
          username,
        },
      })
      .then(() => {
        console.log("Deleted user to ensure acid transaction.");
      });

    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error." });
  }
});

export default router;
