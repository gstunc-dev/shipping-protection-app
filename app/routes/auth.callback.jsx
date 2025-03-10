import { json, redirect } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  if (!session) {
    throw new Response("Unauthorized", { status: 401 });
  }

  // ✅ Call api/install after successful authentication
  const installResponse = await fetch(
    `${process.env.SHOPIFY_APP_URL}/api/install`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
  );

  if (!installResponse.ok) {
    console.error("❌ Install API Failed:", await installResponse.text());
  } else {
    console.log("✅ Install API Called Successfully");
  }
  return redirect(
    `https://${shop}/admin/apps/${process.env.SHOPIFY_APP_HANDLE}`,
  );
  // return json({ success: true, message: "Authentication successful" });
};
