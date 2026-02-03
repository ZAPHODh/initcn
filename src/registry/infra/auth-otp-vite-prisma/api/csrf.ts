import { generateCSRFToken, signCSRFToken } from "@/lib/server/auth/csrf";

export async function GET(): Promise<Response> {
	const token = generateCSRFToken();
	const signature = signCSRFToken(token);

	return Response.json(
		{
			token,
			signature,
		},
		{
			status: 200,
			headers: {
				"Cache-Control": "no-store, no-cache, must-revalidate",
				Pragma: "no-cache",
			},
		},
	);
}
