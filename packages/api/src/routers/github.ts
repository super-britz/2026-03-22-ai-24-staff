import { db } from "@2026-03-22-ai-24-staff/db";
import { githubProfiles } from "@2026-03-22-ai-24-staff/db/schema";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { publicProcedure, router } from "../index";
import { encrypt } from "../lib/crypto";

const githubUserSchema = z.object({
	login: z.string(),
	name: z.string().nullable(),
	avatar_url: z.string(),
	bio: z.string().nullable(),
	email: z.string().nullable(),
	public_repos: z.number(),
	followers: z.number(),
});

async function fetchGitHubUser(token: string) {
	const response = await fetch("https://api.github.com/user", {
		headers: {
			Authorization: `Bearer ${token}`,
			Accept: "application/vnd.github.v3+json",
		},
	});

	if (!response.ok) {
		if (response.status === 401) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "GitHub Token 无效，请检查后重试",
			});
		}
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "GitHub API 调用失败，请稍后重试",
		});
	}

	const data = await response.json();
	return githubUserSchema.parse(data);
}

export const githubRouter = router({
	verifyToken: publicProcedure
		.input(z.object({ token: z.string().min(1).max(255) }))
		.mutation(async ({ input }) => {
			const user = await fetchGitHubUser(input.token);
			return {
				login: user.login,
				name: user.name,
				avatarUrl: user.avatar_url,
				bio: user.bio,
				email: user.email,
				publicRepos: user.public_repos,
				followers: user.followers,
			};
		}),

	saveProfile: publicProcedure
		.input(z.object({ token: z.string().min(1).max(255) }))
		.mutation(async ({ input }) => {
			const user = await fetchGitHubUser(input.token);
			const encryptedToken = encrypt(input.token);

			const result = await db
				.insert(githubProfiles)
				.values({
					login: user.login,
					name: user.name,
					avatarUrl: user.avatar_url,
					bio: user.bio,
					email: user.email,
					publicRepos: user.public_repos,
					followers: user.followers,
					encryptedToken,
				})
				.onConflictDoUpdate({
					target: githubProfiles.login,
					set: {
						name: user.name,
						avatarUrl: user.avatar_url,
						bio: user.bio,
						email: user.email,
						publicRepos: user.public_repos,
						followers: user.followers,
						encryptedToken,
						updatedAt: new Date(),
					},
				})
				.returning({
					id: githubProfiles.id,
					login: githubProfiles.login,
					name: githubProfiles.name,
				});

			return result[0];
		}),
});
