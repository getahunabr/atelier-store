// Grant or revoke the admin role: `npm run admin:grant -- <email>` / `npm run admin:revoke -- <email>`.
// Idempotent. Takes effect on the next request (admin checks bypass the session cookie cache).

import { eq } from "drizzle-orm";

import { db } from "./index";
import { user } from "./schema";

async function main() {
  const [action, email] = process.argv.slice(2);
  if ((action !== "grant" && action !== "revoke") || !email) {
    console.error("Usage: npm run admin:grant -- <email>   |   npm run admin:revoke -- <email>");
    process.exit(1);
  }

  const role = action === "grant" ? "admin" : "user";
  const updated = await db
    .update(user)
    .set({ role, updatedAt: new Date() })
    .where(eq(user.email, email.trim().toLowerCase()))
    .returning({ email: user.email, role: user.role });

  if (updated.length === 0) {
    console.error(`No account found for ${email}. The person needs to create an account first.`);
    process.exit(1);
  }
  console.log(`${updated[0].email} is now "${updated[0].role}".`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
