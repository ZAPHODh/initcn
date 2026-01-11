import { AuthForm } from "@/components/auth-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
          <p className="text-sm text-muted-foreground">
            Enter your email to sign in to your account
          </p>
        </div>

        <AuthForm
          redirectTo="/dashboard"
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
          }}
        />

        <p className="text-center text-xs text-muted-foreground">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
