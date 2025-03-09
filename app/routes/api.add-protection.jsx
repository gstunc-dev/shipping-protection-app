import { json } from "@remix-run/node";
import shopify from "../shopify.server";

export const action = async ({ request }) => {
  const { shop, accessToken } = await shopify.authenticate.admin(request);
  const body = await request.json();
  const { cartId } = body;

  try {
    // Get the product ID
    const response = await shopify.api.rest.Product.all({
      session: { shop, accessToken },
      query: { title: "Shipping Protection" },
    });

    if (response.data.length === 0) {
      return json({ error: "Protection product not found" }, { status: 404 });
    }

    const productId = response.data[0].variants[0].id;

    // Add protection product to cart
    const cartResponse = await fetch(`https://${shop}/cart/add.js`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: productId,
        quantity: 1,
      }),
    });

    return json(await cartResponse.json());
  } catch (error) {
    return json({ error: error.message }, { status: 500 });
  }
};
