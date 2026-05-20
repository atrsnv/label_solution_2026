PRAGMA foreign_keys=OFF;

DROP TABLE IF EXISTS "Earning";
DROP TABLE IF EXISTS "Payout";
DROP TABLE IF EXISTS "Split";
DROP TABLE IF EXISTS "Track";
DROP TABLE IF EXISTS "Report";

CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'ARTIST',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "new_User" ("id", "email", "password", "name", "role", "createdAt", "updatedAt")
SELECT "id", "email", "password", "name", "role", "createdAt", "updatedAt" FROM "User";

DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

PRAGMA foreign_keys=ON;
