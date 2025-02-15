import { json } from "@remix-run/node";
import shopify from "../shopify.server";

export const action = async ({ request }) => {
  const { shop, accessToken } = await shopify.authenticate.admin(request);
  const body = await request.json();
  const { cartId } = body;

  try {
    // Get cart details
    const cartResponse = await fetch(`https://${shop}/cart.js`);
    const cart = await cartResponse.json();

    // Find the protection product in cart
    const protectionItem = cart.items.find(
      (item) => item.product_title === "Shipping Protection",
    );

    if (!protectionItem) {
      return json(
        { error: "Protection fee not found in cart" },
        { status: 404 },
      );
    }

    // Remove the item
    const removeResponse = await fetch(`https://${shop}/cart/change.js`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: protectionItem.id,
        quantity: 0,
      }),
    });

    return json(await removeResponse.json());
  } catch (error) {
    return json({ error: error.message }, { status: 500 });
  }
};
