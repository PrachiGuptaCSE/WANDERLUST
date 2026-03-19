import prisma from "../db";
import { NextRequest, NextResponse } from "next/server";
interface usercreate{
    email:string;
    name?:string;
}
export async function POST(req:NextRequest) {
    try {
        const body:usercreate=await req.json();
        await prisma.$connect();
        const response=await prisma.user.create({
            data:{
                email:body.email,
                name:body.name
            }
        })
        return NextResponse.json({message:response,status:200})
    } catch (error) {
        console.log(error)
        return NextResponse.json({message:error,status:500})
    }finally{
        await prisma.$disconnect();
    }
}