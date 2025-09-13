-- CreateEnum
CREATE TYPE "public"."AccountType" AS ENUM ('CONTA_CORRENTE', 'CONTA_POUPANCA', 'INVESTIMENTO', 'OUTRO');

-- CreateEnum
CREATE TYPE "public"."CardType" AS ENUM ('CREDITO', 'DEBITO');

-- AlterEnum
ALTER TYPE "public"."TransactionType" ADD VALUE 'TRANSFERENCIA';

-- AlterTable
ALTER TABLE "public"."Transaction" ADD COLUMN     "accountId" INTEGER,
ADD COLUMN     "cardId" INTEGER,
ADD COLUMN     "invoiceId" INTEGER;

-- CreateTable
CREATE TABLE "public"."Bank" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "logo" TEXT,

    CONSTRAINT "Bank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Account" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" "public"."AccountType" NOT NULL,
    "balance" DECIMAL(10,2) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "userId" INTEGER NOT NULL,
    "bankId" INTEGER NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Card" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" "public"."CardType" NOT NULL,
    "limit" DECIMAL(10,2) NOT NULL,
    "closingDay" INTEGER NOT NULL,
    "dueDate" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "userId" INTEGER NOT NULL,
    "accountId" INTEGER NOT NULL,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Invoice" (
    "id" SERIAL NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "cardId" INTEGER NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Bank_name_key" ON "public"."Bank"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_cardId_month_year_key" ON "public"."Invoice"("cardId", "month", "year");

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "public"."Card"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "public"."Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Account" ADD CONSTRAINT "Account_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "public"."Bank"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Card" ADD CONSTRAINT "Card_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Card" ADD CONSTRAINT "Card_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invoice" ADD CONSTRAINT "Invoice_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "public"."Card"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
