import { useCallback, useEffect, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSlot,
} from "@/components/ui/input-otp";
import { useSendOTP, useVerifyOTP } from "@/lib/client/auth-mutations";
import { EMAIL_REGEX } from "@/lib/server/utils";
import { OTP_CONFIG } from "@/lib/constants/auth";

const DEFAULT_LABELS = {};
const DEFAULT_REDIRECT = "/dashboard";

interface AuthFormProps {
	redirectTo?: string;
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
		changeEmail?: string;
	};
}

export function AuthForm({
	redirectTo = DEFAULT_REDIRECT,
	labels = DEFAULT_LABELS,
}: AuthFormProps) {
	const [currentStep, setCurrentStep] = useState<1 | 2>(1);
	const [otp, setOTP] = useState("");
	const [countdown, setCountdown] = useState(OTP_CONFIG.COUNTDOWN_SECONDS);

	const sendOTP = useSendOTP({
		onSuccess: () => {
			setCurrentStep(2);
			setCountdown(OTP_CONFIG.COUNTDOWN_SECONDS);
		},
	});

	const verifyOTP = useVerifyOTP({
		onSuccess: () => {
			setCountdown(0);
			form.reset();
		},
	});

	// Focus OTP input when step changes to step 2
	useEffect(() => {
		if (currentStep === 2) {
			const otpInput = document.querySelector('[id="otp"]') as HTMLElement;
			otpInput?.focus();
		}
	}, [currentStep]);

	const form = useForm({
		defaultValues: {
			email: "",
		},
		onSubmit: async ({ value }) => {
			await sendOTP.mutateAsync(value.email);
		},
	});

	useEffect(() => {
		if (countdown <= 0) return;

		const intervalId = setInterval(() => {
			setCountdown((prev) => Math.max(0, prev - 1));
		}, 1000);

		return () => clearInterval(intervalId);
	}, [countdown]);

	const emailPlaceholder = labels.emailPlaceholder ?? "you@example.com";
	const emailRequired = labels.emailRequired ?? "Email is required";
	const emailInvalid = labels.emailInvalid ?? "Invalid email address";

	const validateEmail = useCallback(
		(value: string) => {
			if (!value) return emailRequired;
			if (!EMAIL_REGEX.test(value)) {
				return emailInvalid;
			}
			return undefined;
		},
		[emailRequired, emailInvalid],
	);

	const handleOTPSubmit = useCallback(
		async (e: React.FormEvent) => {
			e.preventDefault();
			e.stopPropagation();

			const email = form.getFieldValue("email");
			await verifyOTP.mutateAsync({ email, code: otp });
		},
		[form, otp, verifyOTP],
	);

	const handleResend = useCallback(async () => {
		const email = form.getFieldValue("email");
		if (!email) return;

		setCountdown(0);
		setOTP("");
		await sendOTP.mutateAsync(email);
	}, [form, sendOTP]);

	const handleChangeEmail = useCallback(() => {
		setCurrentStep(1);
		setOTP("");
	}, []);

	if (currentStep === 1) {
		return (
			<div className="flex max-w-full flex-col gap-4">
				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
				>
					<div className="flex flex-col gap-2.5">
						<form.Field name="email" validators={{ onChange: validateEmail }}>
							{(field) => (
								<div className="flex flex-col gap-2">
									<label htmlFor={field.name} className="sr-only">
										Email
									</label>
									<input
										id={field.name}
										placeholder={emailPlaceholder}
										type="email"
										disabled={sendOTP.isPending}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										className="px-3 py-2 border rounded-md"
									/>
									{field.state.meta.errors?.[0] && (
										<p className="text-xs text-red-600" role="alert" aria-live="polite">
											{field.state.meta.errors[0]}
										</p>
									)}
								</div>
							)}
						</form.Field>
						<button
							type="submit"
							disabled={sendOTP.isPending}
							className="px-4 py-2 bg-black text-white rounded-md disabled:opacity-50"
						>
							{sendOTP.isPending
								? labels.sending ?? "Sending..."
								: labels.sendOtp ?? "Send OTP"}
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
					{labels.otpSentTo?.(form.getFieldValue("email")) ??
						`We sent a code to ${form.getFieldValue("email")}`}
				</span>
				<br />
				{labels.verifyDesc ?? "Enter the 6-digit code to continue"}
			</p>
			<form onSubmit={handleOTPSubmit} className="flex flex-col gap-2.5">
				<div className="flex flex-col gap-2">
					<label htmlFor="otp" className="sr-only">
						{labels.enterOtp ?? "Enter OTP"}
					</label>
					<div className="flex justify-center">
						<InputOTP
							id="otp"
							autoFocus
							disabled={verifyOTP.isPending}
							value={otp}
							onChange={setOTP}
							maxLength={OTP_CONFIG.LENGTH}
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
					disabled={verifyOTP.isPending || otp.length !== OTP_CONFIG.LENGTH}
					className="px-4 py-2 bg-black text-white rounded-md disabled:opacity-50"
				>
					{verifyOTP.isPending
						? labels.verifying ?? "Verifying..."
						: labels.verifyOtp ?? "Verify OTP"}
				</button>
			</form>
			<div className="flex items-center justify-between text-sm text-gray-600">
				<span>{labels.didNotReceive ?? "Didn't receive the code?"}</span>
				{countdown > 0 ? (
					<span aria-live="polite" aria-atomic="true">
						{labels.resendIn?.(countdown) ?? `Resend in ${countdown}s`}
					</span>
				) : (
					<button
						type="button"
						onClick={handleResend}
						disabled={sendOTP.isPending}
						className="text-black font-medium hover:underline"
					>
						{sendOTP.isPending
							? labels.resending ?? "Resending..."
							: labels.resend ?? "Resend"}
					</button>
				)}
			</div>
			<button
				type="button"
				onClick={handleChangeEmail}
				className="text-sm text-gray-600 hover:underline"
			>
				{labels.changeEmail ?? "Change email"}
			</button>
		</div>
	);
}
