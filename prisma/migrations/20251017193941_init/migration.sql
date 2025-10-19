-- CreateTable
CREATE TABLE "public"."GeneratedReport" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "displayType" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "userQuestion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "GeneratedReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GeneratedReport_userId_idx" ON "public"."GeneratedReport"("userId");

-- AddForeignKey
ALTER TABLE "public"."GeneratedReport" ADD CONSTRAINT "GeneratedReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
