CREATE TABLE "complaints" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"batch" varchar NOT NULL,
	"year" integer NOT NULL,
	"hostel_name" varchar NOT NULL,
	"title" varchar(100),
	"description" text,
	"category" varchar(50),
	"status" varchar DEFAULT 'pending',
	"created_at" "cal::local_datetime" DEFAULT now(),
	"session" varchar NOT NULL,
	"semester" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extra" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"amount" integer NOT NULL,
	"item" varchar NOT NULL,
	"session" varchar NOT NULL,
	"semester" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fines" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"batch" varchar NOT NULL,
	"year" integer NOT NULL,
	"hostel_name" varchar NOT NULL,
	"amount" integer DEFAULT 0,
	"reason" varchar NOT NULL,
	"date" date NOT NULL,
	"session" varchar NOT NULL,
	"semester" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leaves" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"batch" varchar NOT NULL,
	"year" integer NOT NULL,
	"hostel_name" varchar NOT NULL,
	"from_date" date NOT NULL,
	"to_date" date NOT NULL,
	"reason" text NOT NULL,
	"dsetination" varchar(100) NOT NULL,
	"contact_no" varchar(15) NOT NULL,
	"status" varchar(20) DEFAULT 'pending',
	"session" varchar NOT NULL,
	"semester" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_opt_outs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"from_date" date NOT NULL,
	"to_date" date NOT NULL,
	"breakfast" boolean DEFAULT false,
	"lunch" boolean DEFAULT false,
	"snacks" boolean DEFAULT false,
	"dinner" boolean DEFAULT false,
	"session" varchar(10) NOT NULL,
	"semester" integer NOT NULL,
	"hostel_name" varchar NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messBill" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"batch" varchar NOT NULL,
	"year" integer NOT NULL,
	"hostel_name" varchar NOT NULL,
	"paid" integer NOT NULL,
	"used" integer DEFAULT 0,
	"reduction" integer DEFAULT 0,
	"extra" integer DEFAULT 0,
	"session" varchar NOT NULL,
	"semester" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mess_expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"month" varchar(20) NOT NULL,
	"hostel_name" varchar(100) NOT NULL,
	"total_expense" integer NOT NULL,
	"bill_file_url" varchar(255),
	"uploaded_by" integer,
	"uploaded_at" "cal::local_datetime" DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notices" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"body" text NOT NULL,
	"file_url" varchar(255),
	"issued_by" integer NOT NULL,
	"created_at" "cal::local_datetime" DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "residence_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"session" varchar(10) NOT NULL,
	"semester" integer NOT NULL,
	"year" integer NOT NULL,
	"hostel_name" varchar(100) NOT NULL,
	"room_no" varchar(10) NOT NULL,
	"created_at" "cal::local_datetime" DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "resident_docs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"doc_type" varchar(100) NOT NULL,
	"file_url" varchar(255) NOT NULL,
	"uploaded_at" "cal::local_datetime" DEFAULT now(),
	"name" varchar NOT NULL,
	"session" varchar NOT NULL,
	"semester" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resident_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"batch" varchar NOT NULL,
	"year" integer NOT NULL,
	"branch" varchar NOT NULL,
	"phone_no" varchar(15) NOT NULL,
	"mother_name" varchar(100) NOT NULL,
	"mother_phone" varchar(15) NOT NULL,
	"father_name" varchar(100) NOT NULL,
	"father_phone" varchar(15) NOT NULL,
	"localGuardian_address" text,
	"localGuardian_name" varchar(100),
	"localGuardian_phone" varchar(15),
	CONSTRAINT "resident_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"email" varchar(100) NOT NULL,
	"password" text NOT NULL,
	"role" varchar(20) NOT NULL,
	"hostel_name" varchar NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extra" ADD CONSTRAINT "extra_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fines" ADD CONSTRAINT "fines_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leaves" ADD CONSTRAINT "leaves_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_opt_outs" ADD CONSTRAINT "meal_opt_outs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messBill" ADD CONSTRAINT "messBill_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mess_expenses" ADD CONSTRAINT "mess_expenses_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notices" ADD CONSTRAINT "notices_issued_by_users_id_fk" FOREIGN KEY ("issued_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "residence_history" ADD CONSTRAINT "residence_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resident_docs" ADD CONSTRAINT "resident_docs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resident_profiles" ADD CONSTRAINT "resident_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;