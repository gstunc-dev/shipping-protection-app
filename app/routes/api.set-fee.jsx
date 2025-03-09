import { json } from "@remix-run/node";
import { setProtectionFee } from "../shopify.server";

export const action = async ({ request }) => {
  const { shop, fee } = await request.json();
  await setProtectionFee(shop, fee);
  return json({ success: true });
};
