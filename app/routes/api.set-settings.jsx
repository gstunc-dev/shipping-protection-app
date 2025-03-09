import { json } from "@remix-run/node";
import prisma from "../db.server";
import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const { fee, enabled, minOrder } = await request.json();

  const updatedSettings = await prisma.protectionFee.upsert({
    where: { shop },
    update: { fee, enabled, minOrder },
    create: { shop, fee, enabled, minOrder },
  });

  return json({ success: true, settings: updatedSettings });
};
