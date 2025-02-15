import { json } from "@remix-run/node";
import prisma from "../db.server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const settings = await prisma.protectionFee.findUnique({
    where: { shop },
  });

  return json(settings || { fee: "0.00", enabled: false, minOrder: "0.00" });
};
