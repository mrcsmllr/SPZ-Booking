CREATE TABLE "BookingAdjustment" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "amount" DECIMAL(10,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "stripeSessionId" TEXT,
  "stripePaymentIntent" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BookingAdjustment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BookingAdjustment_stripeSessionId_key"
  ON "BookingAdjustment"("stripeSessionId");

CREATE UNIQUE INDEX "BookingAdjustment_stripePaymentIntent_key"
  ON "BookingAdjustment"("stripePaymentIntent");

CREATE INDEX "BookingAdjustment_bookingId_status_idx"
  ON "BookingAdjustment"("bookingId", "status");

ALTER TABLE "BookingAdjustment"
ADD CONSTRAINT "BookingAdjustment_bookingId_fkey"
FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
