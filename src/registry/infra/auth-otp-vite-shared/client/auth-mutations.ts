import {
	useMutation,
	useQueryClient,
	type UseMutationOptions,
} from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
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
				// Handle rate limiting
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
				credentials: "include", // Backend will set httpOnly cookies
			});

			const data: VerifyOTPResponse = await response.json();

			if (!response.ok) {
				// Handle rate limiting
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
		onSuccess: (data) => {
			// Update the current user in the cache with the returned user data
			if (data.user) {
				queryClient.setQueryData(authKeys.currentUser(), data.user);
			}

			// Alternatively, invalidate to refetch from server
			queryClient.invalidateQueries({ queryKey: authKeys.currentUser() });

			toast.success(data.message || "Login successful");

			// Navigate to dashboard or redirect URL
			const redirect = new URLSearchParams(window.location.search).get(
				"redirect",
			);
			navigate(redirect || "/dashboard");
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
			// Clear the current user from cache
			queryClient.setQueryData(authKeys.currentUser(), null);

			// Clear all cached data (optional, but recommended for security)
			queryClient.clear();

			toast.success("Logged out successfully");

			// Navigate to login page
			navigate("/login");
		},
		...options,
	});
}

/**
 * Hook for refreshing the access token
 *
 * This is typically called automatically by an interceptor when a 401 is received
 * You generally don't need to call this manually
 *
 * @example
 * ```tsx
 * const refreshToken = useRefreshToken();
 *
 * // In an API interceptor
 * if (response.status === 401) {
 *   await refreshToken.mutateAsync();
 *   // Retry original request
 * }
 * ```
 */
export function useRefreshToken(
	options?: UseMutationOptions<void, Error, void>,
) {
	return useMutation({
		mutationFn: async (): Promise<void> => {
			const response = await fetch("/api/auth/refresh", {
				method: "POST",
				credentials: "include",
			});

			if (!response.ok) {
				throw new Error("Failed to refresh token");
			}

			// Backend sets new access token cookie
		},
		retry: false, // Don't retry refresh token requests
		...options,
	});
}
