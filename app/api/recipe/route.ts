import prisma from "../db";
import { Choice,Tags } from "@/app/generated/prisma/enums";
import { NextRequest, NextResponse } from "next/server";
import { use } from "react";
interface recipebody{
    recipeName:string;
    ingredients:ingredient[];
    tags:Tags[];
    choice:Choice;
}
interface ingredient{
    id:number,
    recipeid:number,
    name:string,
    quantity:number,
    unit:string
}
export async function POST(req:NextRequest) {
    try {
        const body:recipebody=await req.json();
        const userid= req.headers.get("userid");
        await  prisma.$connect();
        if(!userid){
            return NextResponse.json({status:404})
        }
        const recipe_creation=await prisma.recipes.create({
            data:{
                creatorID:parseInt(userid),
                recipeName:body.recipeName,
                ingeridients:{
                    create:body.ingredients},
                tags:{
                    set:body.tags},
                choice:body.choice
            }
        })
        console.log(recipe_creation)
        return NextResponse.json({message:recipe_creation,status:200})
    } catch (error) {
        console.log(error)
        return NextResponse.json({message:error,status:500})
    }finally{
        await prisma.$disconnect()
    }
}
export async function GET(req:NextRequest,res:NextResponse) {
    try {
        const body:Tags[]= await req.json();
        const userid=req.headers.get("userid")
        if(!userid){
            return NextResponse.json({status:404})
        }
        await prisma.$connect();
        const liked_recipes=await prisma.likedRecipes.findMany({
            where:{
                userId:parseInt(userid)
            },
            select:{
                recipeId:true
            }
        })
        const liked_id=liked_recipes.map(r=>r.recipeId)
        const recipes=await prisma.recipes.findMany({
            where:{
                tags:{
                    hasSome:body
                },
                id:{
                    notIn:liked_id
                }
            },select:{
                ingeridients:true
            }
        })

    } catch (error) {
        console.log(error)
        return NextResponse.json({message:error,status:500})
    }finally{
        await prisma.$disconnect()
    }
}