import { authenticate } from "../shopify.server";
import prisma from "../db.server";

const table = prisma.upsell;
export const action = async ({ request }) => {
  try {
    const { session, admin } = await authenticate.admin(request);
    console.log("✅ Authenticated with scope:", session.scope);

    // Step 1: Check Existing Script Tags
    const scriptCheckQuery = `
      query {
        scriptTags(first: 10) {
          edges {
            node {
              id
              src
            }
          }
        }
      }
    `;

    const scriptCheckResponse = await admin.graphql(scriptCheckQuery);
    const scriptCheckData = await scriptCheckResponse.json();
    // console.log("scriptCheckData", scriptCheckData);

    let existingScript = scriptCheckData?.data?.scriptTags?.edges?.find(
      (edge) => edge.node.src.includes("shipping-protection.js")
    );
    
    let variantIdFromScript = existingScript?.node?.src.split("variantId=")[1];

    // Step 2: Check if the Shipping Protection product exists
    const productQuery = `
      query {
        products(first: 1, query: "title:Shipping Protection") {
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

    const response = await admin.graphql(productQuery);
    const data = await response.json();
    const productEdges = data?.data?.products?.edges || [];
    let productId = productEdges?.[0]?.node?.id;
    let variant = productEdges?.[0]?.node?.variants?.edges?.[0]?.node;
    console.log(variant,"varient")
    let variantId = variant?.id;

    // Step 3: If script tag exists but variant does not exist, delete all script tags
    if (existingScript && !variantIdFromScript) {
      console.log("❌ Script tag exists, but no variant is associated. Deleting scripts...");

      for (const edge of scriptCheckData.data.scriptTags.edges) {
        const scriptTagId = edge.node.id;
        const deleteScriptTagMutation = `
          mutation {
            scriptTagDelete(id: "${scriptTagId}") {
              deletedScriptTagId
              userErrors {
                field
                message
              }
            }
          }
        `;

        await admin.graphql(deleteScriptTagMutation);
        console.log("✅ Deleted script tag:", scriptTagId);
      }

      existingScript = null; // Reset the script check to force new creation
    }

    // Step 4: Create Product & Variant if Not Exists
    if (!productId) {
      console.log("❌ No product found. Creating a new product...");
      const createProductMutation = `
        mutation CreateProduct($input: ProductInput!) {
          productCreate(input: $input) {
            product {
              id
              title
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const createProductResponse = await admin.graphql(createProductMutation, {
        variables: { input: { title: "Shipping Protection", productType: "Service", status: "ACTIVE", published: true } },
      });
      
      const createProductData = await createProductResponse.json();
      productId = createProductData?.data?.productCreate?.product?.id;
      console.log("✅ Created new Shipping Protection product:", productId);
    }

    // Step 5: Create Variant if Not Exists
    if (!variantId) {
      console.log("❌ No variant found. Creating a new variant...",productId);
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
              "price": 20,"inventoryItem":{
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
      
    };
    }

    // Step 6: Create Shopify Script Tag
    if (variantId && !existingScript) {
      console.log("✅ Creating new script tag with Variant ID:", variantId);
      const createScriptTagMutation = `
        mutation CreateScriptTag($input: ScriptTagInput!) {
          scriptTagCreate(input: $input) {
            scriptTag { id }
            userErrors { field message }
          }
        }
      `;
console.log(process.env.SHOPIFY_APP_URL)
console.log(variantId)

      const scriptVariables = {
        input: {
          src: `${process.env.SHOPIFY_APP_URL}/shipping-protection.js?variantId=${variantId}`,
          displayScope: "ALL",
        },
      };

      const scriptResponse = await admin.graphql(createScriptTagMutation, {
        variables: scriptVariables,
      });
     const dbresponse = await table.create({
        data: {
          shop:session.shop,
          name:"Shipping Protection",
          price: parseFloat(20),
          productId,
        },
      });
      console.log(dbresponse,"✅ ScriptTag successfully added!");
    }

    return new Response("✅ Process Completed Successfully", { status: 200 });
  } catch (error) {
    console.error("❌ Unexpected Error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        details: error.message || "Unknown error occurred",
      }),
      { status: 500 }
    );
  }
};