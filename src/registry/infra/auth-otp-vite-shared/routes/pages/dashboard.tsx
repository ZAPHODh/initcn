export function Component() {
	return (
		<div className="flex min-h-screen items-center justify-center px-4">
			<div className="w-full max-w-4xl space-y-6">
				<div className="space-y-2">
					<h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
					<p className="text-sm text-muted-foreground">
						You are successfully authenticated
					</p>
				</div>

				<div className="rounded-lg border p-6">
					<p className="text-sm text-muted-foreground">
						This is a protected page. Only authenticated users can see this
						content.
					</p>
				</div>
			</div>
		</div>
	);
}
