-- CreateEnum
CREATE TYPE "public"."ChatSessionType" AS ENUM ('DUVIDAS_GERAIS', 'DIVIDAS', 'INVESTIMENTOS');

-- AlterTable
ALTER TABLE "public"."ChatSession" ADD COLUMN     "type" "public"."ChatSessionType" NOT NULL DEFAULT 'DUVIDAS_GERAIS';
