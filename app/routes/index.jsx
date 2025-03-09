import { useLoaderData } from "@remix-run/react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return { shop: process.env.SHOPIFY_SHOP || "" };
};

export default function Index() {
  const { shop } = useLoaderData();
  return (
    <div>
      <h1>Welcome to My Shopify App</h1>
      <p>Connected shop: {shop}</p>
    </div>
  );
}
