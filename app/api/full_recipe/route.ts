import prisma from "../db";
import { NextRequest, NextResponse } from "next/server";
export async function GET(req:NextRequest) {
    try {
        const recipe_id=req.headers.get("recipie_id")
        if(!recipe_id){
            return NextResponse.json({message:"no recipe found",status:404})
        }
        await prisma.$connect()
        const recipe_info=await prisma.recipes.findFirst({
            where:{
                id:parseInt(recipe_id)
            }
        })
        console.log(recipe_info)
        return NextResponse.json({message:recipe_info,status:200})
    } catch (error) {
        return NextResponse.json({message:error,status:500})
    }
    finally{
        await prisma.$disconnect()
    }
}