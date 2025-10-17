import { Router } from "express";
import VerifyToken from "../../helpers/verifyToken";
import prisma from "../../prisma";

const router = Router();

router.delete("/", VerifyToken, async (req, res) => {
  const { id } = req.user;
  try {
    const exists = await prisma.user.count({ where: { id } });
    if (exists === 0)
      return res
        .status(404)
        .json({ success: false, message: "User does not exist." });
    await prisma.user.delete({
      where: {
        id: id,
      },
    });
    const forgotKeyExists = await prisma.forgotPassword.count({
      where: { userId: id },
    });
    if (forgotKeyExists !== 0) {
      await prisma.forgotPassword.delete({
        where: {
          userId: id,
        },
      });
    }
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error." });
  }
});

export default router;
