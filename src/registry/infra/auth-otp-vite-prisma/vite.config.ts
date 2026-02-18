import type { Plugin } from "vite";
import type { IncomingMessage, ServerResponse } from "node:http";

/**
 * Helper to read request body from Node.js IncomingMessage stream
 */
async function getRequestBody(req: IncomingMessage): Promise<string> {
	return new Promise((resolve, reject) => {
		let body = "";
		req.on("data", (chunk) => {
			body += chunk.toString();
		});
		req.on("end", () => resolve(body));
		req.on("error", reject);
	});
}

/**
 * Vite plugin that handles authentication API routes during development
 *
 * Routes all /api/auth/* requests to the appropriate handler functions
 * Supports hot reload via dynamic imports
 */
function authApiRoutesPlugin(): Plugin {
	return {
		name: "auth-api-routes",
		configureServer(server) {
			server.middlewares.use(async (req, res, next) => {
				// Only handle /api/auth/* routes
				if (!req.url?.startsWith("/api/auth/")) {
					return next();
				}

				try {
					// Parse URL to get clean path (remove query params)
					const url = new URL(
						req.url,
						`http://${req.headers.host || "localhost"}`,
					);
					const pathname = url.pathname;

					// Map routes to handler files
					const routeMap: Record<
						string,
						{
							file: string;
							method: "GET" | "POST";
						}
					> = {
						"/api/auth/send-otp": {
							file: "./server/api/send-otp",
							method: "POST",
						},
						"/api/auth/verify-otp": {
							file: "./server/api/verify-otp",
							method: "POST",
						},
						"/api/auth/me": { file: "./server/api/me", method: "GET" },
						"/api/auth/logout": {
							file: "./server/api/logout",
							method: "POST",
						},
						"/api/auth/google": {
							file: "./server/api/google",
							method: "GET",
						},
						"/api/auth/google/callback": {
							file: "./server/api/google-callback",
							method: "GET",
						},
					};

					const route = routeMap[pathname];
					if (!route) {
						res.statusCode = 404;
						res.setHeader("Content-Type", "application/json");
						res.end(
							JSON.stringify({
								success: false,
								message: "Route not found",
							}),
						);
						return;
					}

					// Check HTTP method
					if (req.method !== route.method) {
						res.statusCode = 405;
						res.setHeader("Content-Type", "application/json");
						res.setHeader("Allow", route.method);
						res.end(
							JSON.stringify({
								success: false,
								message: "Method not allowed",
							}),
						);
						return;
					}

					// Convert Node.js request to Web Request
					const headers = new Headers();
					for (const [key, value] of Object.entries(req.headers)) {
						if (value) {
							headers.set(key, Array.isArray(value) ? value[0] : value);
						}
					}

					const body =
						req.method !== "GET" && req.method !== "HEAD"
							? await getRequestBody(req)
							: undefined;

					const request = new Request(url, {
						method: req.method,
						headers,
						body,
					});

					// Dynamic import for hot reload support
					const handler = await server.ssrLoadModule(route.file);
					const handlerFn = handler[route.method];

					if (!handlerFn || typeof handlerFn !== "function") {
						res.statusCode = 500;
						res.setHeader("Content-Type", "application/json");
						res.end(
							JSON.stringify({
								success: false,
								message: "Handler not found",
							}),
						);
						return;
					}

					// Execute handler
					const response: Response = await handlerFn(request);

					// Convert Web Response to Node.js response
					res.statusCode = response.status;

					// Copy headers
					response.headers.forEach((value, key) => {
						res.setHeader(key, value);
					});

					// Send body
					const responseBody = await response.text();
					res.end(responseBody);
				} catch (error) {
					console.error("API route error:", error);
					res.statusCode = 500;
					res.setHeader("Content-Type", "application/json");
					res.end(
						JSON.stringify({
							success: false,
							message: "Internal server error",
						}),
					);
				}
			});
		},
	};
}

/**
 * Export plugin for users to add to their vite.config.ts
 *
 * Usage:
 * ```ts
 * import { authApiRoutesPlugin } from './vite.config.auth'
 *
 * export default defineConfig({
 *   plugins: [react(), authApiRoutesPlugin()],
 * })
 * ```
 */
export { authApiRoutesPlugin };
