-- CreateEnum
CREATE TYPE "Gewerk" AS ENUM ('MALER', 'FLIESENLEGER', 'ELEKTRIKER', 'SHK', 'SONSTIGES');

-- CreateEnum
CREATE TYPE "AuftragStatus" AS ENUM ('ENTWURF', 'ANGEBOT_ERSTELLT', 'GESENDET', 'ABGESCHLOSSEN');

-- CreateEnum
CREATE TYPE "AngebotStatus" AS ENUM ('ENTWURF', 'FERTIG', 'EXPORTIERT');

-- CreateEnum
CREATE TYPE "Einheit" AS ENUM ('M2', 'M', 'STK', 'STD', 'PAUSCHAL');

-- CreateTable
CREATE TABLE "Betrieb" (
    "id" TEXT NOT NULL,
    "firmenname" TEXT NOT NULL,
    "inhaber" TEXT NOT NULL,
    "strasse" TEXT NOT NULL,
    "plz" TEXT NOT NULL,
    "stadt" TEXT NOT NULL,
    "steuernummer" TEXT NOT NULL,
    "telefon" TEXT NOT NULL,
    "email" TEXT,
    "logo" TEXT,
    "stundensatz" DOUBLE PRECISION NOT NULL DEFAULT 65.0,
    "gewerk" "Gewerk" NOT NULL DEFAULT 'SONSTIGES',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Betrieb_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Auftrag" (
    "id" TEXT NOT NULL,
    "betriebId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kundenname" TEXT,
    "objektAdresse" TEXT,
    "beschreibung" TEXT,
    "status" "AuftragStatus" NOT NULL DEFAULT 'ENTWURF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Auftrag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Foto" (
    "id" TEXT NOT NULL,
    "auftragId" TEXT NOT NULL,
    "dateipfad" TEXT NOT NULL,
    "analyseErgebnis" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Foto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Angebot" (
    "id" TEXT NOT NULL,
    "auftragId" TEXT NOT NULL,
    "angebotsnummer" TEXT NOT NULL,
    "datum" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gueltigBis" TIMESTAMP(3) NOT NULL,
    "gesamtNetto" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mwstBetrag" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gesamtBrutto" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "zahlungsbedingungen" TEXT NOT NULL DEFAULT 'Zahlbar innerhalb von 14 Tagen ohne Abzug.',
    "status" "AngebotStatus" NOT NULL DEFAULT 'ENTWURF',
    "pdfPfad" TEXT,

    CONSTRAINT "Angebot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Angebotsposition" (
    "id" TEXT NOT NULL,
    "angebotId" TEXT NOT NULL,
    "reihenfolge" INTEGER NOT NULL,
    "bezeichnung" TEXT NOT NULL,
    "menge" DOUBLE PRECISION NOT NULL,
    "einheit" "Einheit" NOT NULL,
    "einzelpreisNetto" DOUBLE PRECISION NOT NULL,
    "gesamtpreisNetto" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Angebotsposition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Angebot_auftragId_key" ON "Angebot"("auftragId");

-- CreateIndex
CREATE UNIQUE INDEX "Angebot_angebotsnummer_key" ON "Angebot"("angebotsnummer");

-- CreateIndex
CREATE INDEX "Angebotsposition_angebotId_reihenfolge_idx" ON "Angebotsposition"("angebotId", "reihenfolge");

-- AddForeignKey
ALTER TABLE "Auftrag" ADD CONSTRAINT "Auftrag_betriebId_fkey" FOREIGN KEY ("betriebId") REFERENCES "Betrieb"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Foto" ADD CONSTRAINT "Foto_auftragId_fkey" FOREIGN KEY ("auftragId") REFERENCES "Auftrag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Angebot" ADD CONSTRAINT "Angebot_auftragId_fkey" FOREIGN KEY ("auftragId") REFERENCES "Auftrag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Angebotsposition" ADD CONSTRAINT "Angebotsposition_angebotId_fkey" FOREIGN KEY ("angebotId") REFERENCES "Angebot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
