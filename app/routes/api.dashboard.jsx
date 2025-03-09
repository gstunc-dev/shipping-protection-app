import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { session, admin } = await authenticate(request);

  // Define product filter criteria (Modify this to match your shipping protection product)
  const SHIPPING_PROTECTION_TITLE = "Shipping Protection";

  try {
    // ✅ Fetch recent orders (Modify 'limit' as needed)
    const ordersResponse = await admin.rest.get({
      path: "orders",
      query: {
        status: "any", // Fetch all orders
        limit: 50, // Adjust based on needs
      },
    });

    const allOrders = ordersResponse.orders;

    // ✅ Filter orders that contain the shipping protection product
    const filteredOrders = allOrders.filter((order) =>
      order.line_items.some((item) =>
        item.title.includes(SHIPPING_PROTECTION_TITLE),
      ),
    );

    // ✅ Calculate total revenue from shipping protection sales
    const totalShippingRevenue = filteredOrders.reduce((acc, order) => {
      const shippingProtectionRevenue = order.line_items
        .filter((item) => item.title.includes(SHIPPING_PROTECTION_TITLE))
        .reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0);

      return acc + shippingProtectionRevenue;
    }, 0);

    // ✅ Prepare analytics data (grouping by month)
    const monthlySalesData = filteredOrders.reduce((acc, order) => {
      const orderDate = new Date(order.created_at);
      const month = `${orderDate.getFullYear()}-${orderDate.getMonth() + 1}`; // YYYY-MM format

      if (!acc[month]) {
        acc[month] = { month, totalSales: 0, totalOrders: 0 };
      }

      acc[month].totalSales += parseFloat(order.total_price);
      acc[month].totalOrders += 1;

      return acc;
    }, {});

    return new Response(
      JSON.stringify({
        analytics: Object.values(monthlySalesData),
        totalShippingRevenue,
        filteredOrders: filteredOrders.map((order) => ({
          id: order.id,
          name: order.name,
          total: order.total_price,
          created_at: order.created_at,
        })),
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
