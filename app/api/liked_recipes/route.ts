import prisma from "../db";
import { NextRequest, NextResponse } from "next/server";
export async function POST(req:NextRequest) {
    try {
        const userid= req.headers.get("userid");
        const recipeid=req.headers.get('recipie_id')
        if(!userid || !recipeid){
            return NextResponse.json({message:"no userid",status:404})
        }
        await prisma.$connect();
        const like=await prisma.likedRecipes.create({
            data:{
                userId:parseInt(userid),
                recipeId:parseInt(recipeid)
            }
        })
        console.log(like)
        return NextResponse.json({message:like,status:200})
    } catch (error) {
        console.log(error)
        return NextResponse.json({message:error,status:500})
    }finally{
        await prisma.$disconnect();
    }
}
export async function GET(req:NextRequest) {
    try {
        const userid= req.headers.get("userid");
        if(!userid ){
            return NextResponse.json({message:"no userid",status:404})
        }
        await prisma.$connect();
        const liked=await prisma.likedRecipes.findMany({
            where:{
                userId:parseInt(userid)
            }
        })
        console.log(liked)
        return NextResponse.json({message:liked,status:200})
    } catch (error) {
        console.log(error)
        return NextResponse.json({message:error,status:500})
    }finally{
        await prisma.$disconnect();
    }
}