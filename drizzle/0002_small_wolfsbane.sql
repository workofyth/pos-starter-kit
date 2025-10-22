ALTER TABLE "inventory_transactions" ADD COLUMN "status" text DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD COLUMN "approved_by" text;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_approved_by_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;