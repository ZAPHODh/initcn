import { Suspense } from "react";
import { useNavigate } from "react-router-dom";
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

export function LoginDialog({
	redirectTo = "/dashboard",
	title = "Welcome back",
	description = "Enter your email to sign in to your account",
}: LoginDialogProps) {
	const navigate = useNavigate();

	function handleOpenChange(open: boolean) {
		if (!open) {
			navigate("/");
		}
	}

	return (
		<Dialog open onOpenChange={handleOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>

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

function LoginDialogSkeleton() {
	return (
		<div className="flex flex-col gap-4 animate-pulse">
			<div className="h-10 bg-gray-200 rounded-md" />
			<div className="h-10 bg-gray-200 rounded-md" />
		</div>
	);
}
