-- CreateTable
CREATE TABLE "SearchHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "searchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SearchHistory_userId_term_locale_key" ON "SearchHistory"("userId", "term", "locale");

-- CreateIndex
CREATE INDEX "SearchHistory_userId_locale_searchedAt_idx" ON "SearchHistory"("userId", "locale", "searchedAt" DESC);
