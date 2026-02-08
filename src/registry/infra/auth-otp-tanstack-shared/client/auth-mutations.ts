import {
	useMutation,
	useQueryClient,
	type UseMutationOptions,
} from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { authKeys } from "./query-keys";
import type {
	SendOTPRequest,
	SendOTPResponse,
	VerifyOTPRequest,
	VerifyOTPResponse,
	LogoutResponse,
} from "../types";

/**
 * Hook for sending OTP to user's email
 *
 * @example
 * ```tsx
 * function LoginForm() {
 *   const sendOTP = useSendOTP();
 *
 *   async function handleSubmit(email: string) {
 *     await sendOTP.mutateAsync(email);
 *     setStep(2); // Move to OTP verification step
 *   }
 *
 *   return (
 *     <button onClick={() => handleSubmit(email)} disabled={sendOTP.isPending}>
 *       {sendOTP.isPending ? 'Sending...' : 'Send Code'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useSendOTP(
	options?: UseMutationOptions<SendOTPResponse, Error, string>,
) {
	return useMutation({
		mutationFn: async (email: string): Promise<SendOTPResponse> => {
			const response = await fetch("/api/auth/send-otp", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email } satisfies SendOTPRequest),
				credentials: "include",
			});

			const data: SendOTPResponse = await response.json();

			if (!response.ok) {
				if (response.status === 429) {
					throw new Error(
						data.message ||
							"Too many requests. Please try again later.",
					);
				}

				throw new Error(data.error || data.message || "Failed to send OTP");
			}

			return data;
		},
		onError: (error) => {
			toast.error(error.message || "Failed to send verification code");
		},
		onSuccess: (data) => {
			toast.success(data.message || "Verification code sent to your email");
		},
		...options,
	});
}

/**
 * Hook for verifying OTP and logging in
 *
 * @example
 * ```tsx
 * function OTPVerificationForm() {
 *   const verifyOTP = useVerifyOTP();
 *
 *   async function handleVerify(email: string, code: string) {
 *     await verifyOTP.mutateAsync({ email, code });
 *     // User is now logged in, query cache is updated
 *   }
 *
 *   return (
 *     <button onClick={() => handleVerify(email, code)} disabled={verifyOTP.isPending}>
 *       {verifyOTP.isPending ? 'Verifying...' : 'Verify'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useVerifyOTP(
	options?: UseMutationOptions<VerifyOTPResponse, Error, VerifyOTPRequest>,
) {
	const queryClient = useQueryClient();
	const navigate = useNavigate();

	return useMutation({
		mutationFn: async (
			request: VerifyOTPRequest,
		): Promise<VerifyOTPResponse> => {
			const response = await fetch("/api/auth/verify-otp", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(request),
				credentials: "include", // Backend sets httpOnly session cookie
			});

			const data: VerifyOTPResponse = await response.json();

			if (!response.ok) {
				if (response.status === 429) {
					throw new Error(
						data.message || "Too many attempts. Please try again later.",
					);
				}

				throw new Error(
					data.error || data.message || "Invalid verification code",
				);
			}

			return data;
		},
		onError: (error) => {
			toast.error(error.message || "Failed to verify code");
		},
		onSuccess: () => {
			// Invalidate to refetch current user from server
			queryClient.invalidateQueries({ queryKey: authKeys.currentUser() });

			toast.success("Login successful");

			// Navigate to dashboard or redirect URL
			const redirect = new URLSearchParams(window.location.search).get(
				"redirect",
			);
			navigate({ to: redirect || "/dashboard" });
		},
		...options,
	});
}

/**
 * Hook for logging out the current user
 *
 * @example
 * ```tsx
 * function LogoutButton() {
 *   const logout = useLogout();
 *
 *   return (
 *     <button onClick={() => logout.mutate()} disabled={logout.isPending}>
 *       {logout.isPending ? 'Logging out...' : 'Logout'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useLogout(
	options?: UseMutationOptions<LogoutResponse, Error, void>,
) {
	const queryClient = useQueryClient();
	const navigate = useNavigate();

	return useMutation({
		mutationFn: async (): Promise<LogoutResponse> => {
			const response = await fetch("/api/auth/logout", {
				method: "POST",
				credentials: "include",
			});

			const data: LogoutResponse = await response.json();

			if (!response.ok) {
				throw new Error(data.message || "Failed to logout");
			}

			return data;
		},
		onError: (error) => {
			toast.error(error.message || "Failed to logout");
		},
		onSuccess: () => {
			// Clear all cached data
			queryClient.clear();

			toast.success("Logged out successfully");

			navigate({ to: "/login" });
		},
		...options,
	});
}
