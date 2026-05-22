CREATE TABLE "attendance_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"hostel_name" varchar(100) NOT NULL,
	"session" varchar(20) NOT NULL,
	"semester" integer NOT NULL,
	"academic_year" integer NOT NULL,
	"attendance_date" date NOT NULL,
	"check_in_time" timestamp DEFAULT now() NOT NULL,
	"status" varchar(20) DEFAULT 'present' NOT NULL,
	"proof_video_url" varchar(255) NOT NULL,
	"verification_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"verified_by" integer,
	"verification_remark" text,
	"verified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
