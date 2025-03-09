import shopify from "../shopify.server";
import prisma from "../db.server";

const table = prisma.upsell;

export async function action({ request }) {
  try {
    // Step 1: Authenticate Admin
    const { session, admin } = await shopify.authenticate.admin(request);
    const shop = session.shop;
    console.log(`✅ Authenticated shop: ${shop} with scope: ${session.scope}`);

    // Parse request data
    const { name, price } = await request.json();

    if (!name || !price) {
      return new Response(JSON.stringify({ error: "Missing required fields: name or price" }), { status: 400 });
    }

    // Step 2: Fetch Existing Product
    const query = `
      query {
        products(first: 1, query: "title:${name}") {
          edges { node { id title } }
        }
      }
    `;

    const response = await admin.graphql(query);
    const data = await response.json();

    if (!data || !data.data) {
      return new Response(JSON.stringify({ error: "Invalid Shopify response" }), { status: 500 });
    }

    // Step 3: Check if the Product Already Exists
    const existingProduct = data?.data?.products?.edges?.[0]?.node;
    let productId;
    let variantId;

    if (existingProduct) {
      productId = existingProduct.id;
      return new Response(JSON.stringify({ message: `Product already exists` }), { status: 500 });
    } else {
      console.log(`ℹ️ No existing product found. Creating a new one...`);

      // Step 4: Create Product
      const createProductMutation = `
      mutation CreateProduct($input: ProductInput!) {
        productCreate(input: $input) {
          product {
            id
            title
            productType
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const createProductResponse = await admin.graphql(createProductMutation, {
      variables: { input: { title: name, productType: "Service", status: "ACTIVE", published: true } },
    });
    
    const createProductData = await createProductResponse.json();
    productId = createProductData?.data?.productCreate?.product?.id;
    console.log("✅ Created new Shipping Protection product:", productId);
      // const response = await admin.graphql(
      //   `#graphql
      //   mutation updateProductMetafields($input: ProductInput!) {
      //     productUpdate(input: $input) {
      //       product {
      //         id
      //         metafields(first: 5) {
      //           edges {
      //             node {
      //               id
      //               namespace
      //               key
      //               value
      //             }
      //           }
      //         }
      //       }
      //       userErrors {
      //         message
      //         field
      //       }
      //     }
      //   }`,
      //   {
      //     variables: {
      //       input: {
      //         id: productId, // Replace with your actual Product ID
      //         metafields: [
      //           {
      //             namespace: "upsell_price",
      //             key: "upsellprice",  // ✅ New metafield
      //             type: "single_line_text_field",
      //             value: price.toString() // Convert number to string (Shopify requires strings)
      //           }
      //         ]
      //       }
      //     }
      //   }
      // );
      
      // const data = await response.json();
      // console.log("Updated Metafields:", JSON.stringify(data));
      // console.log("META FIELD UPDATE ENDED")
    }
    if (!variantId) {
      console.log("❌ No variant found. Creating a new variant...");

      const createVariantMutation = `
        mutation CreateProductVariant($productId: ID!,$variants: [ProductVariantsBulkInput!]!) {
          productVariantsBulkCreate(productId: $productId,variants: $variants,strategy:REMOVE_STANDALONE_VARIANT) {
            product {
              id
            }
            productVariants {
              id
              title
              price
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const createVariantResponse = await admin.graphql(createVariantMutation, {
        variables: {
          productId: productId, // ✅ Ensure correct product ID format
          variants: [
            {
              "optionValues": [
                
              ],
              "price": price,
              "inventoryItem":{
                "requiresShipping": false,
                tracked: false
              }
            }
          ],
        },
      });

      const createVariantData = await createVariantResponse.json();
      if (
        createVariantData?.data?.productVariantsBulkCreate?.userErrors?.length
      ) {
        console.error(
          "❌ Variant Creation Error:",
          createVariantData.data.productVariantsBulkCreate.userErrors,
        );
      } else {
        variantId =
          createVariantData?.data?.productVariantsBulkCreate
            ?.productVariants?.[0]?.id;
        console.log("✅ Variant Created:", variantId);
      }
    }

    // Step 6: Create Script Tag (Only after Variant exists)
    const createScriptTagMutation = `
      mutation {
        scriptTagCreate(input: { src: "${process.env.SHOPIFY_APP_URL}/shipping-protection.js?variant=${variantId}", displayScope: ALL }) {
          scriptTag { id }
          userErrors { field message }
        }
      }
    `;

    const scriptResponse = await admin.graphql(createScriptTagMutation);
    const scriptData = await scriptResponse.json();

    if (scriptData?.data?.scriptTagCreate?.userErrors?.length) {
      return new Response(JSON.stringify({ error: "Failed to create script tag", details: scriptData.data.scriptTagCreate.userErrors }), { status: 500 });
    }
    console.log(`✅ ScriptTag successfully added with Variant ID: ${variantId}`);

    // Step 7: Save Product Data to Database
    await table.create({
      data: {
        shop,
        name,
        price: parseFloat(price),
        productId,
      },
    });
    console.log("✅ Upsell saved to database");

    return new Response(JSON.stringify({ success: true, productId, variantId }), { status: 200 });
  } catch (error) {
    console.error(`❌ Unexpected error`, error);
    return new Response(JSON.stringify({ error: "Failed to process request", details: error.message }), { status: 500 });
  }
}
