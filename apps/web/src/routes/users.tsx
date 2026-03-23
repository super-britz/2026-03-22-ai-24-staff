import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@2026-03-22-ai-24-staff/ui/components/avatar";
import { Skeleton } from "@2026-03-22-ai-24-staff/ui/components/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@2026-03-22-ai-24-staff/ui/components/table";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { GitHubBindForm } from "@/components/github-bind-form";
import { trpc } from "@/utils/trpc";

import type { Route } from "./+types/users";

export function meta(_args: Route.MetaArgs) {
	return [
		{ title: "用户列表 - 2026-03-22-ai-24-staff" },
		{
			name: "description",
			content: "查看已绑定的 GitHub 用户列表",
		},
	];
}

function formatDate(date: Date | string) {
	return new Date(date).toLocaleString("zh-CN", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	});
}

function TableSkeleton() {
	return (
		<TableBody>
			{Array.from({ length: 3 }, (_, i) => (
				<TableRow key={i}>
					<TableCell>
						<Skeleton className="h-10 w-10 rounded-full" />
					</TableCell>
					<TableCell>
						<Skeleton className="h-4 w-24" />
					</TableCell>
					<TableCell>
						<Skeleton className="h-4 w-20" />
					</TableCell>
					<TableCell>
						<Skeleton className="h-4 w-32" />
					</TableCell>
					<TableCell>
						<Skeleton className="h-4 w-28" />
					</TableCell>
					<TableCell>
						<Skeleton className="h-4 w-12" />
					</TableCell>
					<TableCell>
						<Skeleton className="h-4 w-12" />
					</TableCell>
					<TableCell>
						<Skeleton className="h-4 w-28" />
					</TableCell>
				</TableRow>
			))}
		</TableBody>
	);
}

export default function UsersPage() {
	const queryClient = useQueryClient();
	const { data: users, isLoading } = useQuery(trpc.github.list.queryOptions());

	return (
		<div className="container mx-auto px-4 py-8">
			<h1 className="mb-6 font-bold text-2xl">用户列表</h1>

			<div className="mb-8 max-w-lg">
				<GitHubBindForm
					onSuccess={() => {
						queryClient.invalidateQueries({
							queryKey: trpc.github.list.queryOptions().queryKey,
						});
					}}
				/>
			</div>

			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-16">头像</TableHead>
							<TableHead>用户名</TableHead>
							<TableHead>姓名</TableHead>
							<TableHead>简介</TableHead>
							<TableHead>邮箱</TableHead>
							<TableHead className="text-right">仓库数</TableHead>
							<TableHead className="text-right">粉丝数</TableHead>
							<TableHead>绑定时间</TableHead>
						</TableRow>
					</TableHeader>
					{isLoading ? (
						<TableSkeleton />
					) : !users || users.length === 0 ? (
						<TableBody>
							<TableRow>
								<TableCell
									colSpan={8}
									className="h-24 text-center text-muted-foreground"
								>
									暂无绑定用户
								</TableCell>
							</TableRow>
						</TableBody>
					) : (
						<TableBody>
							{users.map((user) => (
								<TableRow key={user.id}>
									<TableCell>
										<Avatar>
											<AvatarImage
												src={user.avatarUrl ?? undefined}
												alt={user.login}
											/>
											<AvatarFallback>
												{user.login.slice(0, 2).toUpperCase()}
											</AvatarFallback>
										</Avatar>
									</TableCell>
									<TableCell className="font-medium">{user.login}</TableCell>
									<TableCell>{user.name ?? "-"}</TableCell>
									<TableCell className="max-w-48 truncate">
										{user.bio ?? "-"}
									</TableCell>
									<TableCell>{user.email ?? "-"}</TableCell>
									<TableCell className="text-right">
										{user.publicRepos}
									</TableCell>
									<TableCell className="text-right">{user.followers}</TableCell>
									<TableCell>{formatDate(user.updatedAt)}</TableCell>
								</TableRow>
							))}
						</TableBody>
					)}
				</Table>
			</div>
		</div>
	);
}
