"use client";

import { useRouter } from "next/navigation";
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
}

export function LoginDialog({ redirectTo = "/dashboard" }: LoginDialogProps) {
  const router = useRouter();

  function handleOpenChange(open: boolean) {
    if (!open) {
      router.back();
    }
  }

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Welcome back</DialogTitle>
          <DialogDescription>
            Enter your email to sign in to your account
          </DialogDescription>
        </DialogHeader>

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
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
