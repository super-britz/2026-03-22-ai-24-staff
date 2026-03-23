import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const githubProfiles = pgTable("github_profiles", {
	id: uuid("id").defaultRandom().primaryKey(),
	login: text("login").notNull().unique(),
	name: text("name"),
	avatarUrl: text("avatar_url"),
	bio: text("bio"),
	email: text("email"),
	publicRepos: integer("public_repos").notNull().default(0),
	followers: integer("followers").notNull().default(0),
	encryptedToken: text("encrypted_token").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
