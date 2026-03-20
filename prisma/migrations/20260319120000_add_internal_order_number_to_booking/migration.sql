-- Add optional internal order number for bookings
ALTER TABLE "Booking"
ADD COLUMN "internalOrderNumber" TEXT;
