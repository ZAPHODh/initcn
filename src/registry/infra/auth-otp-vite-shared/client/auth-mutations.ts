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
				credentials: "include",
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
		onSuccess: (data) => {
			if (data.user) {
				queryClient.setQueryData(authKeys.currentUser(), data.user);
			}

			queryClient.invalidateQueries({ queryKey: authKeys.currentUser() });

			toast.success(data.message || "Login successful");

			const redirect = new URLSearchParams(window.location.search).get(
				"redirect",
			);
			navigate(redirect || "/dashboard");
		},
		...options,
	});
}

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
			queryClient.setQueryData(authKeys.currentUser(), null);
			queryClient.clear();

			toast.success("Logged out successfully");

			navigate("/login");
		},
		...options,
	});
}

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
		},
		retry: false,
		...options,
	});
}
