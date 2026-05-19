import prisma from "../db";
import { Choice,Tags } from "@/app/generated/prisma/enums";
import { NextRequest, NextResponse } from "next/server";
interface recipebody{
    recipeName:string;
    ingredients:ingredient[];
    tags:Tags[];
    choice:Choice;
    recipe:string
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
        
        if(!userid){
            return NextResponse.json({status:404})
        }
        await  prisma.$connect();
        const recipe_creation=await prisma.recipes.create({
            data:{
                creatorID:parseInt(userid),
                recipeName:body.recipeName,
                ingeridients:{
                    create:body.ingredients},
                tags:{
                    set:body.tags},
                choice:body.choice,
                recipe:body.recipe
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


const RECENCY_WINDOW = 20;

/**
 * Exponential decay factor per position in the recency-sorted list.
 * Position 0 (most recent like) gets weight 1.0,
 * position 1 gets DECAY^1, position 2 gets DECAY^2, …
 *
 * 0.85 gives a gentle ramp-down so old likes still matter, just less.
 */
const DECAY = 0.85;

/** How many candidate recipes to pull from the DB before in-memory scoring. */
const CANDIDATE_LIMIT = 50;

// ─── Types ────────────────────────────────────────────────────────────────────

interface TagFrequencyMap {
  [tag: string]: number; // accumulated (decayed) weight
}

interface RecipeCandidate {
  id: number;
  recipeName: string;
  choice: string;
  tags: Tags[];
  ingeridients: {
    name: string;
    quantity: number;
    unit: string;
  }[];
}

// ─── Algorithm ────────────────────────────────────────────────────────────────

/**
 * Builds a weighted tag-frequency map from a user's recent likes.
 *
 * Recipes are expected sorted newest-first (index 0 = most recent).
 * Each recipe's tags are added with an exponentially decayed weight
 * so that the user's freshest preferences dominate the profile.
 *
 * Time complexity: O(R × T)  where R = recency window, T = avg tags per recipe
 */
function buildTagProfile(
  recentLikes: { tags: Tags[] }[]
): TagFrequencyMap {
  const profile: TagFrequencyMap = {};

  recentLikes.slice(0, RECENCY_WINDOW).forEach((recipe, position) => {
    const weight = Math.pow(DECAY, position); // 1.0, 0.85, 0.72 …
    for (const tag of recipe.tags) {
      profile[tag] = (profile[tag] ?? 0) + weight;
    }
  });

  return profile;
}

/**
 * Scores a single candidate recipe against the tag profile.
 *
 * Score = sum of profile weights for each matching tag,
 *         normalised by the candidate's total tag count so that
 *         recipes with fewer tags aren't unfairly penalised.
 *
 * Returns 0 for untagged recipes (they fall to the bottom).
 */
function scoreRecipe(
  candidate: RecipeCandidate,
  profile: TagFrequencyMap
): number {
  if (!candidate.tags.length) return 0;

  const rawScore = candidate.tags.reduce(
    (sum, tag) => sum + (profile[tag] ?? 0),
    0
  );

  // Normalise: divide by tag count so a 1-tag recipe that perfectly matches
  // isn't beaten by a 10-tag recipe with only 1 match.
  return rawScore / candidate.tags.length;
}

// ─── Route Handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    // ── 1. Validate user ────────────────────────────────────────────────────
    const rawUserId = req.headers.get("userid");
    if (!rawUserId) {
      return NextResponse.json(
        { message: "Missing userid header" },
        { status: 400 }
      );
    }
    const userId = parseInt(rawUserId, 10);
    if (isNaN(userId)) {
      return NextResponse.json(
        { message: "Invalid userid header" },
        { status: 400 }
      );
    }

    // ── 2. Parse optional tag filter from body ──────────────────────────────
    let bodyTags: Tags[] = [];
    try {
      bodyTags = await req.json();
    } catch {
      // No body / invalid JSON → treat as "no filter"
    }

    await prisma.$connect();

    // ── 3. Fetch user's liked recipe IDs + tag profile in one go ───────────
    //    Sorted newest-first so the decay logic works correctly.
    const likedRecordsRaw = await prisma.likedRecipes.findMany({
      where: { userId },
      orderBy: { likedAt: "desc" },
      take: RECENCY_WINDOW,
      select: {
        recipeId: true,
        recipe: {
          select: { tags: true },
        },
      },
    });

    const likedIds = likedRecordsRaw.map((r) => r.recipeId);
    const recentLikedWithTags = likedRecordsRaw.map((r) => r.recipe);

    // ── 4. Build the user's tag preference profile ──────────────────────────
    const tagProfile = buildTagProfile(recentLikedWithTags);
    const profileIsEmpty = Object.keys(tagProfile).length === 0;

    // ── 5. Fetch unseen candidate recipes ───────────────────────────────────
    //    If the user has no likes yet, fetch any CANDIDATE_LIMIT recipes.
    //    If body tags provided, use them as a pre-filter for efficiency.
    const candidates = await prisma.recipes.findMany({
      where: {
        id: { notIn: likedIds.length ? likedIds : undefined },
        ...(bodyTags.length > 0 && !profileIsEmpty
          ? { tags: { hasSome: bodyTags } }
          : {}),
      },
      take: CANDIDATE_LIMIT,
      select: {
        id: true,
        recipeName: true,
        choice: true,
        tags: true,
        ingeridients: {
          select: { name: true, quantity: true, unit: true },
        },
      },
    });

    if (!candidates.length) {
      return NextResponse.json(
        { message: "No new recipes available" },
        { status: 404 }
      );
    }

    // ── 6. Score & rank in memory ───────────────────────────────────────────
    //    O(C × T) where C = CANDIDATE_LIMIT, T = avg tags per recipe
    let recommended: RecipeCandidate;

    if (profileIsEmpty) {
      // New user: return a random recipe (no preference signal yet)
      recommended = candidates[Math.floor(Math.random() * candidates.length)];
    } else {
      // Score every candidate and pick the highest
      let bestScore = -1;
      let bestRecipe = candidates[0];

      for (const candidate of candidates) {
        const score = scoreRecipe(candidate, tagProfile);
        if (score > bestScore) {
          bestScore = score;
          bestRecipe = candidate;
        }
      }
      recommended = bestRecipe;
    }

    // ── 7. Return result ────────────────────────────────────────────────────
    return NextResponse.json(
      {
        recipe: recommended,
        // Debug info – remove in production if desired
        _debug: {
          candidatesEvaluated: candidates.length,
          tagProfileSize: Object.keys(tagProfile).length,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[GET /api/recipes/next]", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}