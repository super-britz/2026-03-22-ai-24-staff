import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@2026-03-22-ai-24-staff/ui/components/avatar";
import { Button } from "@2026-03-22-ai-24-staff/ui/components/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
} from "@2026-03-22-ai-24-staff/ui/components/card";
import { Input } from "@2026-03-22-ai-24-staff/ui/components/input";
import { Label } from "@2026-03-22-ai-24-staff/ui/components/label";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";

interface GitHubUser {
	login: string;
	name: string | null;
	avatarUrl: string;
	bio: string | null;
	email: string | null;
	publicRepos: number;
	followers: number;
}

interface GitHubBindFormProps {
	onSuccess: () => void;
}

export function GitHubBindForm({ onSuccess }: GitHubBindFormProps) {
	const [token, setToken] = useState("");
	const [previewUser, setPreviewUser] = useState<GitHubUser | null>(null);

	const verifyMutation = useMutation(
		trpc.github.verifyToken.mutationOptions({
			onSuccess(data) {
				setPreviewUser(data);
			},
		}),
	);

	const saveMutation = useMutation(
		trpc.github.saveProfile.mutationOptions({
			onSuccess() {
				setPreviewUser(null);
				setToken("");
				toast.success("GitHub 账号绑定成功");
				onSuccess();
			},
		}),
	);

	function handleVerify(e: React.FormEvent) {
		e.preventDefault();
		verifyMutation.mutate({ token });
	}

	function handleSave() {
		saveMutation.mutate({ token });
	}

	function handleCancel() {
		setPreviewUser(null);
		verifyMutation.reset();
	}

	return (
		<>
			{!previewUser ? (
				<Card>
					<form onSubmit={handleVerify}>
						<CardHeader>
							<p className="text-muted-foreground text-sm">
								输入你的 GitHub Personal Access Token 来绑定账号
							</p>
						</CardHeader>
						<CardContent>
							<div className="grid gap-2">
								<Label htmlFor="token">GitHub Token</Label>
								<Input
									id="token"
									type="password"
									placeholder="ghp_xxxxxxxxxxxx"
									value={token}
									onChange={(e) => setToken(e.target.value)}
								/>
							</div>
							{verifyMutation.isError && (
								<p className="mt-2 text-destructive text-sm">
									{verifyMutation.error.message}
								</p>
							)}
						</CardContent>
						<CardFooter>
							<Button
								type="submit"
								disabled={!token.trim() || verifyMutation.isPending}
							>
								{verifyMutation.isPending ? "验证中..." : "验证 Token"}
							</Button>
						</CardFooter>
					</form>
				</Card>
			) : (
				<Card>
					<CardHeader>
						<p className="text-muted-foreground text-sm">
							确认以下 GitHub 用户信息无误后点击保存
						</p>
					</CardHeader>
					<CardContent>
						<div className="flex items-start gap-4">
							<Avatar className="h-16 w-16">
								<AvatarImage
									src={previewUser.avatarUrl}
									alt={previewUser.login}
								/>
								<AvatarFallback>
									{previewUser.login.slice(0, 2).toUpperCase()}
								</AvatarFallback>
							</Avatar>
							<div className="grid gap-1">
								<p className="font-semibold text-lg">{previewUser.login}</p>
								{previewUser.name && (
									<p className="text-muted-foreground text-sm">
										{previewUser.name}
									</p>
								)}
								{previewUser.bio && (
									<p className="text-sm">{previewUser.bio}</p>
								)}
								{previewUser.email && (
									<p className="text-muted-foreground text-sm">
										{previewUser.email}
									</p>
								)}
								<div className="flex gap-4 text-muted-foreground text-sm">
									<span>公开仓库: {previewUser.publicRepos}</span>
									<span>粉丝: {previewUser.followers}</span>
								</div>
							</div>
						</div>
						{saveMutation.isError && (
							<p className="mt-4 text-destructive text-sm">
								{saveMutation.error.message}
							</p>
						)}
					</CardContent>
					<CardFooter className="flex gap-2">
						<Button onClick={handleSave} disabled={saveMutation.isPending}>
							{saveMutation.isPending ? "保存中..." : "确认保存"}
						</Button>
						<Button
							variant="outline"
							onClick={handleCancel}
							disabled={saveMutation.isPending}
						>
							取消
						</Button>
					</CardFooter>
				</Card>
			)}
		</>
	);
}
