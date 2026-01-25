"use client";

import { useActionState } from "react";

type HealthCheckStatus = "ok" | "warning" | "error";

interface HealthCheck {
	status: HealthCheckStatus;
	message: string;
	hint?: string;
}

interface DiagnosticsPanelProps {
	checkAuthHealth: () => Promise<{
		success: boolean;
		checks: {
			database: HealthCheck;
			redis: HealthCheck;
			email: HealthCheck;
			oauth: HealthCheck;
			session: HealthCheck;
		};
		warnings: string[];
	}>;
}

export function AuthDiagnosticsPanel({ checkAuthHealth }: DiagnosticsPanelProps) {
	const [state, action, isPending] = useActionState(checkAuthHealth, null);

	return (
		<div className="border rounded-lg p-6 max-w-2xl">
			<div className="flex items-center justify-between mb-4">
				<h2 className="text-xl font-semibold">Authentication Health Check</h2>
				<button
					onClick={() => action()}
					disabled={isPending}
					className="px-4 py-2 bg-black text-white rounded-md disabled:opacity-50 text-sm"
				>
					{isPending ? "Running..." : "Run Diagnostics"}
				</button>
			</div>

			{state?.checks && (
				<div className="space-y-3">
					<HealthCheckItem check={state.checks.database} label="Database" />
					<HealthCheckItem check={state.checks.redis} label="Redis" />
					<HealthCheckItem check={state.checks.email} label="Email Service" />
					<HealthCheckItem check={state.checks.oauth} label="OAuth" />
					<HealthCheckItem check={state.checks.session} label="Session" />
				</div>
			)}

			{state?.warnings && state.warnings.length > 0 && (
				<div className="mt-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
					<h3 className="font-medium text-yellow-800 mb-2">Warnings</h3>
					<ul className="space-y-1 text-sm text-yellow-700">
						{state.warnings.map((warning, i) => (
							<li key={i}>• {warning}</li>
						))}
					</ul>
				</div>
			)}

			{!state && (
				<p className="text-sm text-gray-500 mt-4">
					Click "Run Diagnostics" to check your authentication configuration
				</p>
			)}
		</div>
	);
}

function HealthCheckItem({ check, label }: { check: HealthCheck; label: string }) {
	const statusColors = {
		ok: "bg-green-100 text-green-800 border-green-200",
		warning: "bg-yellow-100 text-yellow-800 border-yellow-200",
		error: "bg-red-100 text-red-800 border-red-200",
	};

	const statusIcons = {
		ok: "✓",
		warning: "⚠",
		error: "✗",
	};

	return (
		<div className={`p-3 rounded border ${statusColors[check.status]}`}>
			<div className="flex items-start justify-between">
				<div className="flex-1">
					<div className="flex items-center gap-2 mb-1">
						<span className="font-medium">{statusIcons[check.status]}</span>
						<span className="font-medium">{label}</span>
					</div>
					<p className="text-sm">{check.message}</p>
					{check.hint && (
						<p className="text-xs mt-2 opacity-80">
							<strong>Hint:</strong> {check.hint}
						</p>
					)}
				</div>
			</div>
		</div>
	);
}
