-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'STAFF');

-- CreateEnum
CREATE TYPE "VehicleCondition" AS ENUM ('USED', 'BRAND_NEW');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'SOLD');

-- CreateEnum
CREATE TYPE "BodyType" AS ENUM ('SEDAN', 'HATCHBACK', 'SUV', 'CROSSOVER', 'PICKUP', 'VAN', 'MPV', 'COUPE', 'WAGON', 'OTHER');

-- CreateEnum
CREATE TYPE "FuelType" AS ENUM ('PETROL', 'DIESEL', 'HYBRID', 'PLUG_IN_HYBRID', 'ELECTRIC', 'CNG');

-- CreateEnum
CREATE TYPE "Transmission" AS ENUM ('AUTOMATIC', 'MANUAL');

-- CreateEnum
CREATE TYPE "EnquiryStatus" AS ENUM ('NEW', 'CONTACTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "EnquirySource" AS ENUM ('VEHICLE_PAGE', 'CONTACT_PAGE', 'GENERAL');

-- CreateEnum
CREATE TYPE "SellRequestStatus" AS ENUM ('NEW', 'CONTACTED', 'EVALUATING', 'CLOSED');

-- CreateEnum
CREATE TYPE "SellIntent" AS ENUM ('SELL', 'EXCHANGE');

-- CreateEnum
CREATE TYPE "SellVehicleCondition" AS ENUM ('EXCELLENT', 'GOOD', 'FAIR', 'NEEDS_WORK');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STAFF',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "variant" TEXT,
    "year" INTEGER NOT NULL,
    "condition" "VehicleCondition" NOT NULL,
    "bodyType" "BodyType" NOT NULL,
    "fuelType" "FuelType" NOT NULL,
    "transmission" "Transmission" NOT NULL,
    "mileage" INTEGER,
    "engine" TEXT,
    "color" TEXT,
    "price" INTEGER,
    "priceDisplay" TEXT,
    "status" "VehicleStatus" NOT NULL DEFAULT 'AVAILABLE',
    "description" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "soldAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_images" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "thumbUrl" TEXT,
    "storageKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "width" INTEGER,
    "height" INTEGER,
    "alt" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enquiries" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT,
    "vehicleTitle" TEXT,
    "vehicleSlug" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "message" TEXT NOT NULL,
    "source" "EnquirySource" NOT NULL DEFAULT 'GENERAL',
    "status" "EnquiryStatus" NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "locale" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enquiries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sell_requests" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "vehicleMake" TEXT NOT NULL,
    "vehicleModel" TEXT NOT NULL,
    "vehicleYear" INTEGER NOT NULL,
    "mileage" INTEGER,
    "condition" "SellVehicleCondition",
    "expectedPrice" INTEGER,
    "intent" "SellIntent" NOT NULL,
    "message" TEXT,
    "status" "SellRequestStatus" NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "locale" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sell_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sell_request_images" (
    "id" TEXT NOT NULL,
    "sellRequestId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "thumbUrl" TEXT,
    "storageKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sell_request_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "businessName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT NOT NULL,
    "addressUr" TEXT,
    "googleMapsUrl" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "facebookUrl" TEXT,
    "instagramUrl" TEXT,
    "openingHours" TEXT,
    "openingHoursUr" TEXT,
    "description" TEXT,
    "descriptionUr" TEXT,
    "heroTitle" TEXT,
    "heroTitleUr" TEXT,
    "heroSubtitle" TEXT,
    "heroSubtitleUr" TEXT,
    "heroImageUrl" TEXT,
    "showDemoNotice" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_slug_key" ON "vehicles"("slug");

-- CreateIndex
CREATE INDEX "vehicles_status_idx" ON "vehicles"("status");

-- CreateIndex
CREATE INDEX "vehicles_make_model_idx" ON "vehicles"("make", "model");

-- CreateIndex
CREATE INDEX "vehicles_featured_idx" ON "vehicles"("featured");

-- CreateIndex
CREATE INDEX "vehicles_price_idx" ON "vehicles"("price");

-- CreateIndex
CREATE INDEX "vehicles_year_idx" ON "vehicles"("year");

-- CreateIndex
CREATE INDEX "vehicles_createdAt_idx" ON "vehicles"("createdAt");

-- CreateIndex
CREATE INDEX "vehicle_images_vehicleId_sortOrder_idx" ON "vehicle_images"("vehicleId", "sortOrder");

-- CreateIndex
CREATE INDEX "enquiries_status_idx" ON "enquiries"("status");

-- CreateIndex
CREATE INDEX "enquiries_createdAt_idx" ON "enquiries"("createdAt");

-- CreateIndex
CREATE INDEX "sell_requests_status_idx" ON "sell_requests"("status");

-- CreateIndex
CREATE INDEX "sell_requests_createdAt_idx" ON "sell_requests"("createdAt");

-- CreateIndex
CREATE INDEX "sell_request_images_sellRequestId_idx" ON "sell_request_images"("sellRequestId");

-- AddForeignKey
ALTER TABLE "vehicle_images" ADD CONSTRAINT "vehicle_images_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sell_request_images" ADD CONSTRAINT "sell_request_images_sellRequestId_fkey" FOREIGN KEY ("sellRequestId") REFERENCES "sell_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
