"use client";

import { useEffect, useState, useActionState } from "react";
import { toast } from "sonner";
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSlot,
} from "@/registry/ui/input-otp";

interface AuthFormServerActionProps {
	sendOTPAction: (prevState: unknown, formData: FormData) => Promise<{
		success: boolean;
		message?: string;
		error?: string;
	}>;
	verifyOTPAction: (prevState: unknown, formData: FormData) => Promise<{
		success: boolean;
		message?: string;
		error?: string;
		attemptsRemaining?: number;
	}>;
	labels?: {
		emailPlaceholder?: string;
		sendOtp?: string;
		sending?: string;
		otpSent?: string;
		otpSentDesc?: string;
		otpFailed?: string;
		otpSentTo?: (email: string) => string;
		verifyDesc?: string;
		enterOtp?: string;
		verifyOtp?: string;
		verifying?: string;
		verifiedSuccess?: string;
		verifyFailed?: string;
		didNotReceive?: string;
		resendIn?: (countdown: number) => string;
		resend?: string;
		resending?: string;
		emailRequired?: string;
		emailInvalid?: string;
	};
}

export function AuthFormServerAction({
	sendOTPAction,
	verifyOTPAction,
	labels = {},
}: AuthFormServerActionProps) {
	const [currentStep, setCurrentStep] = useState<1 | 2>(1);
	const [email, setEmail] = useState("");
	const [otp, setOTP] = useState("");
	const [countdown, setCountdown] = useState(30);

	const [sendState, sendAction, sendPending] = useActionState(sendOTPAction, null);
	const [verifyState, verifyAction, verifyPending] = useActionState(verifyOTPAction, null);

	useEffect(() => {
		if (sendState?.success) {
			setCurrentStep(2);
			toast.success(labels.otpSent ?? "OTP sent", {
				description: labels.otpSentDesc ?? "Check your email for the code",
			});
			setCountdown(30);
		} else if (sendState?.error) {
			toast.error(labels.otpFailed ?? "Failed to send OTP", {
				description: sendState.error,
			});
		}
	}, [sendState, labels]);

	useEffect(() => {
		if (verifyState?.error) {
			toast.error(labels.verifyFailed ?? "Verification failed", {
				description: verifyState.error,
			});
		}
	}, [verifyState, labels]);

	useEffect(() => {
		let intervalId: NodeJS.Timeout | undefined;

		if (countdown > 0 && currentStep === 2) {
			intervalId = setInterval(() => {
				setCountdown((prev) => prev - 1);
			}, 1000);

			return () => {
				if (intervalId) {
					clearInterval(intervalId);
				}
			};
		}
	}, [countdown, currentStep]);

	if (currentStep === 1) {
		return (
			<div className="flex max-w-full flex-col gap-4">
				<form action={sendAction}>
					<div className="flex flex-col gap-2.5">
						<div className="flex flex-col gap-2">
							<label htmlFor="email" className="sr-only">
								Email
							</label>
							<input
								id="email"
								name="email"
								placeholder={labels.emailPlaceholder ?? "you@example.com"}
								type="email"
								disabled={sendPending}
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								required
								className="px-3 py-2 border rounded-md"
							/>
						</div>
						<button
							type="submit"
							disabled={sendPending}
							className="px-4 py-2 bg-black text-white rounded-md disabled:opacity-50"
						>
							{sendPending
								? (labels.sending ?? "Sending...")
								: (labels.sendOtp ?? "Send OTP")}
						</button>
					</div>
				</form>
			</div>
		);
	}

	return (
		<div className="flex max-w-full flex-col gap-4">
			<p className="text-center text-sm text-gray-600">
				<span className="break-all">
					{labels.otpSentTo?.(email) ?? `We sent a code to ${email}`}
				</span>
				<br />
				{labels.verifyDesc ?? "Enter the 6-digit code to continue"}
			</p>
			<form action={verifyAction} className="flex flex-col gap-2.5">
				<input type="hidden" name="email" value={email} />
				<input type="hidden" name="code" value={otp} />
				<div className="flex flex-col gap-2">
					<label htmlFor="otp" className="sr-only">
						{labels.enterOtp ?? "Enter OTP"}
					</label>
					<div className="flex justify-center">
						<InputOTP
							id="otp"
							autoFocus
							disabled={verifyPending}
							value={otp}
							onChange={setOTP}
							maxLength={6}
						>
							<InputOTPGroup className="flex gap-2">
								<InputOTPSlot index={0} />
								<InputOTPSlot index={1} />
								<InputOTPSlot index={2} />
								<InputOTPSlot index={3} />
								<InputOTPSlot index={4} />
								<InputOTPSlot index={5} />
							</InputOTPGroup>
						</InputOTP>
					</div>
				</div>
				<button
					type="submit"
					disabled={verifyPending || otp.length !== 6}
					className="px-4 py-2 bg-black text-white rounded-md disabled:opacity-50"
				>
					{verifyPending
						? (labels.verifying ?? "Verifying...")
						: (labels.verifyOtp ?? "Verify OTP")}
				</button>
			</form>
			<div className="flex items-center justify-between text-sm text-gray-600">
				<span>{labels.didNotReceive ?? "Didn't receive the code?"}</span>
				{countdown > 0 ? (
					<span>
						{labels.resendIn?.(countdown) ?? `Resend in ${countdown}s`}
					</span>
				) : (
					<form action={sendAction} className="inline">
						<input type="hidden" name="email" value={email} />
						<button
							type="submit"
							disabled={sendPending}
							className="text-black font-medium hover:underline"
						>
							{sendPending
								? (labels.resending ?? "Resending...")
								: (labels.resend ?? "Resend")}
						</button>
					</form>
				)}
			</div>
			<button
				type="button"
				onClick={() => {
					setCurrentStep(1);
					setOTP("");
				}}
				className="text-sm text-gray-600 hover:underline"
			>
				Change email
			</button>
		</div>
	);
}
