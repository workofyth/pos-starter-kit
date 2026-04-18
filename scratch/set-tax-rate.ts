import { db } from "../db";
import { appSettings } from "../db/schema/pos";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Setting default tax rate in app_settings...");
  
  await db.insert(appSettings).values({
    key: "tax_rate",
    value: "10",
    description: "Default tax rate for POS transactions (%)",
  }).onConflictDoUpdate({
    target: appSettings.key,
    set: { 
      value: "10",
      updatedAt: new Date()
    }
  });

  console.log("Success: tax_rate set to 10%");
  process.exit(0);
}

main().catch((err) => {
  console.error("Error setting tax rate:", err);
  process.exit(1);
});
