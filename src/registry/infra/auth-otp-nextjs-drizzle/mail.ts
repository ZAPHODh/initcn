import { Resend } from "resend";
import OTPEmail from "@/emails/otp-email";

const isProduction = process.env.NODE_ENV === "production";
const resend = isProduction ? new Resend(process.env.RESEND_API_KEY) : null;

export async function sendOTP({
	to,
	code,
	userName,
}: {
	to: string;
	code: string;
	userName?: string;
}) {
	if (!isProduction) {
		console.log(`[DEV] OTP for ${to}: ${code}`);
		return;
	}

	await resend!.emails.send({
		from: process.env.AUTH_EMAIL_FROM!,
		to,
		subject: "Your verification code",
		react: OTPEmail({ userName, code }),
	});
}
