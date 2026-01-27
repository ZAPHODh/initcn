import { createFileRoute, redirect } from "@tanstack/react-router";
import { AuthForm } from "@/components/auth-form";
import { ensureCurrentUser } from "@/lib/client/auth/auth-queries";

export const Route = createFileRoute("/login")({
	beforeLoad: async ({ context }) => {
		// Redirect to home if already authenticated
		const user = await ensureCurrentUser(context.queryClient);
		if (user) {
			throw redirect({ to: "/" });
		}
	},
	component: LoginPage,
});

function LoginPage() {
	return (
		<div className="flex min-h-screen items-center justify-center">
			<div className="w-full max-w-md space-y-6 p-6">
				<div className="space-y-2 text-center">
					<h1 className="text-3xl font-bold">Welcome Back</h1>
					<p className="text-muted-foreground">
						Enter your email to receive a one-time password
					</p>
				</div>
				<AuthForm redirectTo="/" />
			</div>
		</div>
	);
}
