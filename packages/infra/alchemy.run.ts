import alchemy from "alchemy";
import { ReactRouter } from "alchemy/cloudflare";
import { config } from "dotenv";

config({ path: "./.env" });
config({ path: "../../apps/web/.env" });

const app = await alchemy("2026-03-22-ai-24-staff");

export const web = await ReactRouter("web", {
	cwd: "../../apps/web",
	bindings: {
		VITE_SERVER_URL: alchemy.env.VITE_SERVER_URL!,
	},
});

console.log(`Web    -> ${web.url}`);

await app.finalize();
