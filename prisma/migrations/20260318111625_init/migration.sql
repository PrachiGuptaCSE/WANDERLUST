-- CreateEnum
CREATE TYPE "Tags" AS ENUM ('SPICY', 'VEGAN', 'VEGETARIAN', 'GULTEN_FREE', 'QUICK', 'ITALIAN', 'INDIAN', 'MEXCIAN', 'CHINESE', 'DESSERT', 'BREAKFAST', 'HIGH_PROTEIN', 'LOW_CARBS', 'HEALTHY');

-- CreateEnum
CREATE TYPE "Choice" AS ENUM ('VEG', 'NONVEG');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "email" TEXT NOT NULL,
    "name" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recipes" (
    "id" SERIAL NOT NULL,
    "recipeName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creatorID" INTEGER NOT NULL,
    "tags" "Tags"[],
    "choice" "Choice" NOT NULL DEFAULT 'VEG',

    CONSTRAINT "Recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LikedRecipes" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "recipeId" INTEGER NOT NULL,
    "likedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LikedRecipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ingeridients" (
    "id" SERIAL NOT NULL,
    "recipeId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,

    CONSTRAINT "Ingeridients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "LikedRecipes_userId_likedAt_idx" ON "LikedRecipes"("userId", "likedAt");

-- CreateIndex
CREATE UNIQUE INDEX "LikedRecipes_userId_recipeId_key" ON "LikedRecipes"("userId", "recipeId");

-- CreateIndex
CREATE INDEX "Ingeridients_recipeId_idx" ON "Ingeridients"("recipeId");

-- AddForeignKey
ALTER TABLE "Recipes" ADD CONSTRAINT "Recipes_creatorID_fkey" FOREIGN KEY ("creatorID") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LikedRecipes" ADD CONSTRAINT "LikedRecipes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LikedRecipes" ADD CONSTRAINT "LikedRecipes_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ingeridients" ADD CONSTRAINT "Ingeridients_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
