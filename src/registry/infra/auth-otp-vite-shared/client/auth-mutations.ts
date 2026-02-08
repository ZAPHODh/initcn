import {
  type UseMutationOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import type {
  LogoutResponse,
  SendOTPRequest,
  SendOTPResponse,
  VerifyOTPRequest,
  VerifyOTPResponse,
} from "@/lib/server/auth/types";
import { authKeys } from "./query-keys";

export function useSendOTP(
  options?: UseMutationOptions<SendOTPResponse, Error, string>,
) {
  return useMutation({
    mutationFn: async (email: string): Promise<SendOTPResponse> => {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email } satisfies SendOTPRequest),
      });

      const data: SendOTPResponse = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error(
            data.message || "Too many requests. Please try again later.",
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
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
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
