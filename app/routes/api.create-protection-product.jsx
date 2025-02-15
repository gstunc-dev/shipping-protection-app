import { json } from "@remix-run/node";
// import shopify from "../shopify.server";
import shopify, { getProtectionFee } from "../shopify.server";

export const action = async ({ request }) => {
  const { shop, accessToken } = await shopify.authenticate.admin(request);

  try {
    const fee = await getProtectionFee(shop);
    // Check if product already exists
    const response = await shopify.api.rest.Product.all({
      session: { shop, accessToken },
      query: { title: "Shipping Protection" },
    });

    let product;
    if (response.data.length > 0) {
      product = response.data[0]; // Use existing product
    } else {
      // Create product if it doesn’t exist
      const newProduct = new shopify.api.rest.Product({
        session: { shop, accessToken },
      });
      newProduct.title = "Shipping Protection";
      newProduct.body_html = "Protection for your order.";
      newProduct.status = "active"; // Change to "draft" if you want it hidden
      newProduct.variants = [{ price: fee }];
      await newProduct.save();
      product = newProduct;
    }

    return json({ productId: product.id });
  } catch (error) {
    return json({ error: error.message }, { status: 500 });
  }
};
