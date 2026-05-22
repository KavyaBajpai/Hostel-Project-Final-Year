CREATE TABLE IF NOT EXISTS "hostel_geofences" (
	"hostel_name" varchar(100) PRIMARY KEY NOT NULL,
	"center_latitude" numeric(10, 7) NOT NULL,
	"center_longitude" numeric(10, 7) NOT NULL,
	"radius_meters" integer DEFAULT 150 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_by" integer REFERENCES "public"."users"("id"),
	"updated_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "attendance_records"
ADD COLUMN IF NOT EXISTS "check_in_latitude" numeric(10, 7),
ADD COLUMN IF NOT EXISTS "check_in_longitude" numeric(10, 7),
ADD COLUMN IF NOT EXISTS "location_accuracy_meters" numeric(8, 2),
ADD COLUMN IF NOT EXISTS "location_verified" boolean DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS "location_remark" text;
