/*
  Warnings:

  - The primary key for the `Bank` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "public"."Account" DROP CONSTRAINT "Account_bankId_fkey";

-- DropIndex
DROP INDEX "public"."Bank_name_key";

-- AlterTable
ALTER TABLE "public"."Account" ALTER COLUMN "bankId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "public"."Bank" DROP CONSTRAINT "Bank_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "Bank_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Bank_id_seq";

-- AddForeignKey
ALTER TABLE "public"."Account" ADD CONSTRAINT "Account_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "public"."Bank"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
