-- CreateEnum
CREATE TYPE "public"."DebtStatus" AS ENUM ('ACTIVE', 'PAID_OFF', 'PENDING', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."DebtType" AS ENUM ('CREDIT_CARD', 'PERSONAL_LOAN', 'AUTO_LOAN', 'STUDENT_LOAN', 'MORTGAGE', 'OVERDRAFT', 'RETAIL_FINANCING', 'OTHER');

-- CreateTable
CREATE TABLE "public"."Debt" (
    "id" SERIAL NOT NULL,
    "description" TEXT NOT NULL,
    "creditor" TEXT,
    "type" "public"."DebtType" NOT NULL,
    "initialAmount" DECIMAL(10,2) NOT NULL,
    "outstandingBalance" DECIMAL(10,2) NOT NULL,
    "interestRate" DECIMAL(5,2),
    "minimumPayment" DECIMAL(10,2),
    "paymentDueDate" INTEGER,
    "startDate" TIMESTAMP(3) NOT NULL,
    "estimatedEndDate" TIMESTAMP(3),
    "status" "public"."DebtStatus" NOT NULL DEFAULT 'ACTIVE',
    "userId" INTEGER NOT NULL,
    "bankId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Debt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DebtPayment" (
    "id" SERIAL NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "debtId" INTEGER NOT NULL,
    "transactionId" INTEGER NOT NULL,

    CONSTRAINT "DebtPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Debt_userId_idx" ON "public"."Debt"("userId");

-- CreateIndex
CREATE INDEX "Debt_bankId_idx" ON "public"."Debt"("bankId");

-- CreateIndex
CREATE UNIQUE INDEX "DebtPayment_transactionId_key" ON "public"."DebtPayment"("transactionId");

-- CreateIndex
CREATE INDEX "DebtPayment_debtId_idx" ON "public"."DebtPayment"("debtId");

-- AddForeignKey
ALTER TABLE "public"."Debt" ADD CONSTRAINT "Debt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Debt" ADD CONSTRAINT "Debt_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "public"."Bank"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DebtPayment" ADD CONSTRAINT "DebtPayment_debtId_fkey" FOREIGN KEY ("debtId") REFERENCES "public"."Debt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DebtPayment" ADD CONSTRAINT "DebtPayment_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "public"."Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
