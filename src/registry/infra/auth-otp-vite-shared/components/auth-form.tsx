import { useForm } from "@tanstack/react-form";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

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
  };
}

export function AuthForm({
  redirectTo = "/dashboard",
  labels = {},
}: AuthFormProps) {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [otp, setOTP] = useState("");
  const [countdown, setCountdown] = useState(30);

  const form = useForm({
    defaultValues: {
      email: "",
    },
    onSubmit: async ({ value }) => {
      await onEmailSubmit(value);
    },
  });

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined;

    if (countdown > 0) {
      intervalId = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);

      return () => {
        if (intervalId) {
          clearInterval(intervalId);
        }
      };
    }
  }, [countdown]);

  async function onEmailSubmit(data: { email: string }) {
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }
      setCurrentStep(2);
      toast.success(labels.otpSent ?? "OTP sent", {
        description: labels.otpSentDesc ?? "Check your email for the code",
      });
      setCountdown(30);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : (labels.otpFailed ?? "Failed to send OTP");
      toast.error(labels.otpFailed ?? "Failed to send OTP", {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function onOTPSubmit(data: { email: string }) {
    setIsVerifying(true);

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email, code: otp }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }
      setCountdown(0);
      form.reset();
      toast.success(labels.verifiedSuccess ?? "Verification successful");

      navigate(redirectTo);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Something went wrong";
      toast.error(labels.verifyFailed ?? "Verification failed", {
        description: errorMessage,
      });
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleResend() {
    const email = form.getFieldValue("email");
    if (!email) return;
    setCountdown(0);
    setOTP("");
    await onEmailSubmit({ email });
  }

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
            <form.Field
              name="email"
              validators={{
                onChange: ({ value }) => {
                  if (!value)
                    return labels.emailRequired ?? "Email is required";
                  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    return labels.emailInvalid ?? "Invalid email address";
                  }
                  return undefined;
                },
              }}
            >
              {(field) => (
                <div className="flex flex-col gap-2">
                  <label htmlFor={field.name} className="sr-only">
                    Email
                  </label>
                  <input
                    id={field.name}
                    placeholder={labels.emailPlaceholder ?? "you@example.com"}
                    type="email"
                    disabled={isLoading}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="px-3 py-2 border rounded-md"
                  />
                  {field.state.meta.errors?.[0] && (
                    <p className="text-xs text-red-600">
                      {field.state.meta.errors[0]}
                    </p>
                  )}
                </div>
              )}
            </form.Field>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-black text-white rounded-md disabled:opacity-50"
            >
              {isLoading
                ? (labels.sending ?? "Sending...")
                : (labels.sendOtp ?? "Send OTP")}
            </button>
          </div>
        </form>
        <div className="flex items-center gap-2">
          <hr className="flex-1" />
          <span className="text-xs text-gray-500">or</span>
          <hr className="flex-1" />
        </div>
        <a
          href="/api/auth/google"
          className="flex items-center justify-center gap-2 px-4 py-2 border rounded-md hover:bg-gray-50"
        >
          Continue with Google
        </a>
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
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onOTPSubmit({ email: form.getFieldValue("email") });
        }}
        className="flex flex-col gap-2.5"
      >
        <div className="flex flex-col gap-2">
          <label htmlFor="otp" className="sr-only">
            {labels.enterOtp ?? "Enter OTP"}
          </label>
          <div className="flex justify-center">
            <InputOTP
              id="otp"
              autoFocus
              disabled={isVerifying}
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
          disabled={isVerifying || otp.length !== 6}
          className="px-4 py-2 bg-black text-white rounded-md disabled:opacity-50"
        >
          {isVerifying
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
          <button
            type="button"
            onClick={handleResend}
            disabled={isLoading}
            className="text-black font-medium hover:underline"
          >
            {isLoading
              ? (labels.resending ?? "Resending...")
              : (labels.resend ?? "Resend")}
          </button>
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
