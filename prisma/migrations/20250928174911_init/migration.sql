/*
  Warnings:

  - You are about to drop the column `dueDate` on the `Bill` table. All the data in the column will be lost.
  - You are about to drop the column `isPaid` on the `Bill` table. All the data in the column will be lost.
  - Made the column `recurring` on table `Bill` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "public"."Bill_userId_idx";

-- AlterTable
ALTER TABLE "public"."Bill" DROP COLUMN "dueDate",
DROP COLUMN "isPaid",
ADD COLUMN     "accountId" INTEGER,
ADD COLUMN     "cardId" INTEGER,
ADD COLUMN     "dueDateDay" INTEGER,
ALTER COLUMN "recurring" SET NOT NULL;

-- CreateTable
CREATE TABLE "public"."BillPayment" (
    "id" SERIAL NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paymentDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(10,2) NOT NULL,
    "billId" INTEGER NOT NULL,
    "transactionId" INTEGER,

    CONSTRAINT "BillPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BillPayment_transactionId_key" ON "public"."BillPayment"("transactionId");

-- CreateIndex
CREATE INDEX "BillPayment_billId_idx" ON "public"."BillPayment"("billId");

-- AddForeignKey
ALTER TABLE "public"."Bill" ADD CONSTRAINT "Bill_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Bill" ADD CONSTRAINT "Bill_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "public"."Card"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BillPayment" ADD CONSTRAINT "BillPayment_billId_fkey" FOREIGN KEY ("billId") REFERENCES "public"."Bill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BillPayment" ADD CONSTRAINT "BillPayment_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "public"."Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
