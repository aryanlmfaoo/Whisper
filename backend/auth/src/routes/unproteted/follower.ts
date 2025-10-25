import { Router } from "express";
import prisma from "../../prisma";

const router = Router();

router.post("/", async (req, res) => {
  const { thisUser, isFollowingThisUser } = req.body;

  if (!thisUser || typeof thisUser !== "string" || !isFollowingThisUser || typeof isFollowingThisUser !== "string") {
    return res.status(400).json({ success: false, message: "Invalid User" });
  }

  try{const userWhoFollows = await prisma.user.findFirst({ where: { id: thisUser.trim() } });
  const userWhoIsBeingFollowed = await prisma.user.findFirst({where:{id:isFollowingThisUser.trim()}});
  if (!userWhoFollows || !userWhoIsBeingFollowed) {
    return res
      .status(400)
      .json({ success: false, message: "Could not find user" });
  }

  userWhoFollows.following++;
  userWhoIsBeingFollowed.followers++;

  await prisma.user.update({
    where: {
      id: userWhoFollows.id.trim(),
    },
    data: {
      followers: userWhoFollows.following,
    },
  });

  await prisma.user.update({
    where:{
     id:userWhoIsBeingFollowed.id.trim()
    }, data:{
      following:userWhoFollows.followers
    }
  });

  return res.status(201).json({success:true});}catch(e){
    console.error(e);
    return res.status(500).json({success:false})
  }
});

router.delete("/", async(req,res)=>{

    const { thisUser, isUnFollowingThisUser } = req.body;

  if (!thisUser || typeof thisUser !== "string" || !isUnFollowingThisUser || typeof isUnFollowingThisUser !== "string") {
    return res.status(400).json({ success: false, message: "Invalid User" });
  }

  try{const userWhoUnFollows = await prisma.user.findFirst({ where: { id: thisUser.trim() } });
  const userWhoIsBeingUnFollowed = await prisma.user.findFirst({where:{id:isUnFollowingThisUser.trim()}});
  if (!userWhoUnFollows || !userWhoIsBeingUnFollowed) {
    return res
      .status(400)
      .json({ success: false, message: "Could not find user" });
  }

  userWhoUnFollows.following--;
  userWhoIsBeingUnFollowed.followers--;

  await prisma.user.update({
    where: {
      id: userWhoUnFollows.id.trim(),
    },
    data: {
      followers: userWhoUnFollows.following,
    },
  });

  await prisma.user.update({
    where:{
     id:userWhoIsBeingUnFollowed.id.trim()
    }, data:{
      following:userWhoUnFollows.followers
    }
  });

  return res.status(200).json({success:true});}catch(e){
    console.error(e);
    return res.status(500).json({success:false})
  }

});
export default router;
