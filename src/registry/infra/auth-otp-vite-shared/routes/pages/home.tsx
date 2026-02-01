import { Link } from "react-router-dom";

export function Component() {
	return (
		<div className="flex min-h-screen items-center justify-center px-4">
			<div className="w-full max-w-md space-y-6 text-center">
				<div className="space-y-2">
					<h1 className="text-4xl font-bold tracking-tight">Welcome</h1>
					<p className="text-sm text-muted-foreground">
						OTP Authentication Demo
					</p>
				</div>

				<Link
					to="/login"
					className="inline-flex h-10 items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/90"
				>
					Sign In
				</Link>
			</div>
		</div>
	);
}
