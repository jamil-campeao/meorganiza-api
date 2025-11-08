/*
  Warnings:

  - Changed the type of `type` on the `Investment` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "public"."InvestmentType" AS ENUM ('ACAO', 'FII', 'RENDA_FIXA_CDI', 'POUPANCA', 'OUTRO');

-- AlterTable
ALTER TABLE "public"."Investment" ADD COLUMN     "indexer" TEXT,
ADD COLUMN     "initialAmount" DECIMAL(10,2),
ADD COLUMN     "maturityDate" TIMESTAMP(3),
ADD COLUMN     "rate" DECIMAL(5,2),
DROP COLUMN "type",
ADD COLUMN     "type" "public"."InvestmentType" NOT NULL,
ALTER COLUMN "quantity" DROP NOT NULL,
ALTER COLUMN "acquisitionValue" DROP NOT NULL;
