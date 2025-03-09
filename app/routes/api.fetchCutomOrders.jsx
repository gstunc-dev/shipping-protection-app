import shopify from "../shopify.server";
import prisma from "../db.server";

const table = prisma.upsell;

export async function loader({ request }) {
  try {
    // Step 1: Authenticate Admin
    const { session, admin } = await shopify.authenticate.admin(request);
    const shop = session.shop;
    console.log(`✅ Authenticated shop: ${shop} with scope: ${session.scope}`);

    // Step 2: Fetch Product IDs from Prisma
    const upsellProducts = await table.findMany({
      where: { shop },
      select: { productId: true }
    });
    const productIds = upsellProducts.map((product) => product.productId);

    if (!productIds.length) {
      console.log("❌ No product IDs found in database.");
      return new Response(JSON.stringify({ error: "No product IDs found" }), { status: 404 });
    }

    console.log(`✅ Product IDs from Prisma: ${productIds}`);

    // Step 3: Fetch Orders (no product filter in query)
    const query = `
      query {
        orders(first: 20) {
          edges {
            node {
              id
              name
              createdAt
              totalPrice
              customer {
                firstName
                lastName
                email
              }
              lineItems(first: 5) {
                edges {
                  node {
                    title
                    quantity
                    product {
                      id
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;
    console.log(query);

    // Step 4: Fetch Orders
    const response = await admin.graphql(query);
    const orderData = await response.json();

    // Step 5: Post-Filter Orders by Product IDs
    const filteredOrders = orderData?.data?.orders?.edges.filter(order =>
      order.node.lineItems.edges.some(lineItem =>
        productIds.includes(lineItem.node.product.id)
      )
    ) || [];

    if (filteredOrders.length) {
      console.log("✅ Matching orders found:", filteredOrders);
      return new Response(JSON.stringify(filteredOrders), { status: 200 });
    } else {
      console.log("❌ No matching orders found.");
      return new Response(JSON.stringify([]), { status: 200 });
    }

  } catch (error) {
    console.error("❌ Error fetching orders:", error);
    return new Response(JSON.stringify({ error: "Error fetching orders" }), { status: 500 });
  }
}