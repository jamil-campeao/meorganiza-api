/*
  Warnings:

  - Added the required column `analysisSummary` to the `BalanceForecast` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."BalanceForecast" ADD COLUMN     "analysisSummary" TEXT NOT NULL;
