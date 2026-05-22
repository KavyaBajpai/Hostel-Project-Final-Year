ALTER TABLE "attendance_records"
ADD COLUMN "verification_source" varchar(20) DEFAULT 'system' NOT NULL;
--> statement-breakpoint
ALTER TABLE "attendance_records"
ADD COLUMN "face_match_score" decimal(6, 4);
--> statement-breakpoint
ALTER TABLE "attendance_records"
ADD COLUMN "face_match_threshold" decimal(6, 4);
--> statement-breakpoint
ALTER TABLE "attendance_records"
ADD COLUMN "matched_frame_index" integer;
