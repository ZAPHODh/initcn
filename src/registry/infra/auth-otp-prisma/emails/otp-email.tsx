
import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

interface OTPEmailProps {
  userName?: string;
  code: string;
}

/**
 * OTP Email Component
 *
 * @param userName - Optional user name for personalization
 * @param code - 6-digit OTP code
 *
 * @example
 * ```tsx
 * import OTPEmail from "@/emails/otp-email";
 * import { createResendAdapter } from "@/lib/auth/adapters/email/resend";
 *
 * const emailAdapter = createResendAdapter({
 *   from: "noreply@example.com",
 *   emailTemplate: OTPEmail,
 * });
 * ```
 */
export default function OTPEmail({
  userName = "there",
  code = "123456",
}: OTPEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your verification code is {code}</Preview>
      <Tailwind>
        <Body className="bg-gray-100 font-sans">
          <Container className="bg-white mx-auto my-10 p-6 rounded-lg shadow-sm">
            <Text className="text-lg mb-4 text-gray-900">
              Hello {userName},
            </Text>

            <Text className="text-base mb-6 text-gray-700">
              Use the following code to complete your login:
            </Text>

            <Section className="text-center my-8">
              <div className="inline-block bg-gray-50 px-6 py-4 rounded-md border border-gray-200">
                <Text className="text-3xl font-bold tracking-[0.5em] text-gray-900 m-0">
                  {code}
                </Text>
              </div>
            </Section>

            <Text className="text-sm text-gray-600 mb-6">
              This code will expire in 3 minutes. If you didn't request this
              code, you can safely ignore this email.
            </Text>

            <Text className="text-base text-gray-700 mt-8">
              Best regards,
              <br />
              <span className="font-semibold">Your App Team</span>
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

// Example with i18n support (uncomment and adapt):
/*
import { getScopedI18n } from "@/locales/server";

export default async function OTPEmail({
  userName = "there",
  code = "123456",
}: OTPEmailProps) {
  const t = await getScopedI18n("emails.otp");

  return (
    <Html>
      <Head />
      <Preview>{t("preview")}</Preview>
      <Tailwind>
        <Body className="bg-gray-100 font-sans">
          <Container className="bg-white mx-auto my-10 p-6 rounded-lg shadow-sm">
            <Text className="text-lg mb-4 text-gray-900">
              {t("greeting", { userName })}
            </Text>

            <Text className="text-base mb-6 text-gray-700">
              {t("message")}
            </Text>

            <Section className="text-center my-8">
              <div className="inline-block bg-gray-50 px-6 py-4 rounded-md border border-gray-200">
                <Text className="text-3xl font-bold tracking-[0.5em] text-gray-900 m-0">
                  {code}
                </Text>
              </div>
            </Section>

            <Text className="text-sm text-gray-600 mb-6">
              {t("expires")}
            </Text>

            <Text className="text-base text-gray-700 mt-8">
              {t("closing")}
              <br />
              <span className="font-semibold">{t("signature")}</span>
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
*/
