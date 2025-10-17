import {Router} from "express";
import prisma from "../../prisma";
import {genSalt, hash} from "bcrypt";

const router = Router();

router.put("/", async (req,res)=>{
    const {userId, token, newPassword} = req.body;

    if(!userId || !token || !newPassword) return res.status(400).json({success: false , message: "Invalid request."});

    let userTokenData;
    try{
     userTokenData = await prisma.forgotPassword.findUnique({where: { userId: userId, userToken: token}});
     if(!userTokenData) return res.status(400).json({success: false , message:"You never ever made a token request, please do that, or maybe its a db issue i'll see what i can do."});
    }
    catch(e){
        console.error(e);
        return res.status(400).json({success: false , message:"You never ever made a token request, please do that, or maybe its a db issue i'll see what i can do."});
    }

    if(Number(userTokenData.createdAt) + 900000 > Date.now()) return res.status(400).json({
    success:false, message:"Token expired. Please try again later."
    });

    const salt = await genSalt(10);
    const hashedPass = await hash(newPassword, salt);

    try{
        await prisma.user.update({where: {id: userId}, data: {password: hashedPass}});
        res.status(214).json({success:true});
    } catch(e){
        console.error(e);
        return res.status(400).json({success:false, message:"Internal Server Error. Probably with the db."});
    }

});