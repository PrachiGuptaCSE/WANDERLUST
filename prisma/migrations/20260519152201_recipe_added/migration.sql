/*
  Warnings:

  - Added the required column `recipe` to the `Recipes` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Recipes" ADD COLUMN     "recipe" TEXT NOT NULL;
