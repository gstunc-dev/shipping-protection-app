import { json } from "@remix-run/node";
import { getProtectionFee } from "../shopify.server";

const allowedOrigins = [
  "https://shipteststore4395.myshopify.com", // Replace with your store URL
  "https://checkout.shopify.com", // Allow checkout page requests
  "https://admin.shopify.com", // Allow Shopify admin requests
];

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  // ✅ Fetch the protection fee
  const fee = await getProtectionFee(shop);

  // ✅ Get request origin (for CORS)
  const origin = request.headers.get("Origin");

  // ✅ Allow only requests from valid Shopify domains
  if (origin && !allowedOrigins.includes(origin)) {
    return json(
      { error: "CORS not allowed" },
      {
        status: 403,
        headers: {
          "Access-Control-Allow-Origin":
            "https://shipteststore4395.myshopify.com",
        },
      },
    );
  }

  return json(
    { fee },
    {
      headers: {
        "Access-Control-Allow-Origin": origin || "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    },
  );
};

// ✅ Handle CORS Preflight Requests (OPTIONS Method)
export async function action({ request }) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }
}
