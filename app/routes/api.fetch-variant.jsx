import shopify from "../shopify.server";

export async function loader({ request }) {
    const { session, admin } = await shopify.authenticate.admin(request);
    
    // Get variant ID from request URL
    const url = new URL(request.url);
    const variantId = url.searchParams.get("variantId");

    if (!variantId) {
        return new Response(JSON.stringify({ error: "Missing variantId parameter" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        });
    }

    try {
        const response = await admin.graphql(
            `#graphql
            query {
                productVariant(id: "gid://shopify/ProductVariant/${variantId}") {
                    id
                    title
                    price {
                        amount
                        currencyCode
                    }
                }
            }`
        );

        return new Response(JSON.stringify(response), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
