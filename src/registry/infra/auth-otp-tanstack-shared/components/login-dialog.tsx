import { Suspense, lazy } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { AuthForm } from "./auth-form";

interface LoginDialogProps {
	redirectTo?: string;
	title?: string;
	description?: string;
}

/**
 * Login dialog component with OTP authentication
 *
 * Features:
 * - Modal overlay for login form
 * - Suspense boundary for better loading UX
 * - TanStack Router navigation
 * - Customizable title and description
 *
 * @example
 * ```tsx
 * // In TanStack Router with route masking
 * <LoginDialog
 *   redirectTo="/dashboard"
 *   title="Welcome back"
 *   description="Sign in to continue"
 * />
 * ```
 */
export function LoginDialog({
	redirectTo = "/dashboard",
	title = "Welcome back",
	description = "Enter your email to sign in to your account",
}: LoginDialogProps) {
	const navigate = useNavigate();

	function handleOpenChange(open: boolean) {
		if (!open) {
			// Navigate back or to a default route
			navigate({ to: "/" });
		}
	}

	return (
		<Dialog open onOpenChange={handleOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>

				{/* Suspense boundary for loading state */}
				<Suspense fallback={<LoginDialogSkeleton />}>
					<AuthForm
						redirectTo={redirectTo}
						labels={{
							emailPlaceholder: "you@example.com",
							sendOtp: "Send OTP",
							sending: "Sending...",
							otpSent: "OTP sent",
							otpSentDesc: "Check your email for the code",
							otpFailed: "Failed to send OTP",
							otpSentTo: (email: string) => `We sent a code to ${email}`,
							verifyDesc: "Enter the 6-digit code to continue",
							enterOtp: "Enter OTP",
							verifyOtp: "Verify OTP",
							verifying: "Verifying...",
							verifiedSuccess: "Verification successful",
							verifyFailed: "Verification failed",
							didNotReceive: "Didn't receive the code?",
							resendIn: (countdown: number) => `Resend in ${countdown}s`,
							resend: "Resend",
							resending: "Resending...",
							emailRequired: "Email is required",
							emailInvalid: "Invalid email address",
							changeEmail: "Change email",
						}}
					/>
				</Suspense>
			</DialogContent>
		</Dialog>
	);
}

/**
 * Loading skeleton for the login dialog
 * Shows while AuthForm is loading (if needed)
 */
function LoginDialogSkeleton() {
	return (
		<div className="flex flex-col gap-4 animate-pulse">
			<div className="h-10 bg-gray-200 rounded-md" />
			<div className="h-10 bg-gray-200 rounded-md" />
		</div>
	);
}
