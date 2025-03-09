import shopify from "../shopify.server";
import prisma from "../db.server";

export async function loader({ request }) {
  try {
    // Step 1: Authenticate Admin
    const { session, admin } = await shopify.authenticate.admin(request);
    const shop = session.shop;
    console.log(`✅ Authenticated shop1: ${shop} ${request}`);
    
    // Step 2: Fetch Local Upsells (Database)
    const localUpsells = await prisma.upsell.findMany({
      where: { shop },
      select: { id: true, name: true, price: true },
    });

    console.log(`📌 Found ${localUpsells.length} upsells in database for shop: ${shop}`);

    // Step 3: Fetch Shopify Upsells (Live Data)
    const query = `
      query {
        products(first: 10, query: "product_type:Upsell") {
          edges {
            node {
              id
              title
              variants(first: 1) {
                edges {
                  node {
                    id
                    price
                  }
                }
              }
            }
          }
        }
      }
    `;

    const data = await admin.graphql(query);

    if (!data?.data?.products?.edges?.length) {
      console.warn("⚠️ No upsell products found in Shopify.");
      return new Response(JSON.stringify({ upsells: localUpsells }), { status: 200 });
    }

    const shopifyUpsells = data.data.products.edges.map(edge => {
      const price = edge.node.variants.edges.length > 0 
        ? parseFloat(edge.node.variants.edges[0].node.price) 
        : 0.00; // Ensure a valid price
      return {
        id: edge.node.id,
        name: edge.node.title,
        price,
      };
    });

    console.log(`🔄 Fetched ${shopifyUpsells.length} upsells from Shopify.`);

    // Step 4: Sync Database with Shopify Data
    const localUpsellMap = new Map(localUpsells.map(u => [u.id, u]));

    const newUpsells = shopifyUpsells.filter(s => !localUpsellMap.has(s.id))
      .map(s => ({ ...s, shop }));

    const updatedUpsells = shopifyUpsells.filter(s => {
      const existing = localUpsellMap.get(s.id);
      return existing && existing.price !== s.price;
    });

    // Insert new upsells in bulk
    if (newUpsells.length) {
      await prisma.upsell.createMany({ data: newUpsells, skipDuplicates: true });
      console.log(`➕ Added ${newUpsells.length} new upsells to database.`);
    }

    // Bulk update existing upsells
    if (updatedUpsells.length) {
      await Promise.all(
        updatedUpsells.map(update =>
          prisma.upsell.update({
            where: { id: update.id },
            data: { price: update.price },
          })
        )
      );
      console.log(`✏️ Updated ${updatedUpsells.length} upsell prices.`);
    }

    // Step 5: Return Updated Upsells
    const updatedUpsellList = await prisma.upsell.findMany({
      where: { shop },
      select: { id: true, name: true, price: true },
    });

    return new Response(JSON.stringify({
      shopifyUpsells, // Returns both Shopify & local DB data
      updatedUpsells: updatedUpsellList,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ Error fetching upsells:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch upsells" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
