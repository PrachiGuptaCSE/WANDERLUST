import prisma from "../db";
import { NextRequest, NextResponse } from "next/server";
interface recipebody{
    recipeName:string;
    ingredients:string[];
    tags:string[];
    choice:string;
}
export async function POST(req:NextRequest) {
    try {
        const body:recipebody=await req.json();
        const userid:number=
    } catch (error) {
        
    }
}