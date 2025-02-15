import { authenticate } from "../shopify.server";

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
    const existingScript = scriptCheckData?.data?.scriptTags?.edges?.find(
      (edge) => edge.node.src.includes("shipping-protection.js"),
    );

    if (existingScript) {
      console.log("⚠️ Script already exists:", existingScript.node.id);
      return new Response("✅ Script already exists, no action needed", {
        status: 200,
      });
    }

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
    let variantId = variant?.id;
    let variantPrice = parseFloat(variant?.price || "0"); // Ensure we get the price as a float

    const protectionFee = 20.0; // Default price for Shipping Protection

    // Step 3: Update Variant Price if it's 0
    // if (variantId && variantPrice === 0) {
    //   console.log("⚠️ Variant price is 0, updating price...");

    //   const updateVariantMutation = `
    //     mutation UpdateProductVariant($input: ProductVariantInput!) {
    //       productVariantUpdate(input: $input) {
    //         productVariant {
    //           id
    //           price
    //         }
    //         userErrors {
    //           field
    //           message
    //         }
    //       }
    //     }
    //   `;

    //   const updateVariantResponse = await admin.graphql(updateVariantMutation, {
    //     variables: {
    //       input: {
    //         id: variantId,
    //         productId: productId,
    //         price: protectionFee.toFixed(2),
    //       },
    //     },
    //   });

    //   const updateVariantData = await updateVariantResponse.json();
    //   if (updateVariantData?.data?.productVariantUpdate?.userErrors?.length) {
    //     console.error(
    //       "❌ Variant Price Update Error:",
    //       updateVariantData.data.productVariantUpdate.userErrors,
    //     );
    //   } else {
    //     console.log(
    //       "✅ Variant Price Updated:",
    //       updateVariantData?.data?.productVariantUpdate?.productVariant?.price,
    //     );
    //   }
    // }
    // const webhookMutation = `
    //   mutation webhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $webhookSubscription: WebhookSubscriptionInput!) {
    //     webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
    //       webhookSubscription {
    //         id
    //       }
    //       userErrors {
    //         field
    //         message
    //       }
    //     }
    //   }
    // `;

    // const webhookVariables = {
    //   topic: "APP_UNINSTALLED",
    //   webhookSubscription: {
    //     callbackUrl: `${process.env.SHOPIFY_APP_URL}/webhooks/uninstall`, // ✅ Webhook callback for app uninstall
    //     format: "JSON",
    //   },
    // };

    // const webhookResponse = await admin.graphql(webhookMutation, {
    //   variables: webhookVariables,
    // });

    // const webhookData = await webhookResponse.json();
    // if (webhookData?.data?.webhookSubscriptionCreate?.userErrors?.length) {
    //   console.error(
    //     "❌ Webhook Registration Error:",
    //     webhookData.data.webhookSubscriptionCreate.userErrors,
    //   );
    // } else {
    //   console.log("✅ Webhook Registered for App Uninstall!");
    // }

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

      const productVariables = {
        input: {
          title: "Shipping Protection",
          productType: "Service",
          status: "ACTIVE",
          published: true, // ✅ Ensure the product is visible
        },
      };

      const createProductResponse = await admin.graphql(createProductMutation, {
        variables: productVariables,
      });

      const createProductData = await createProductResponse.json();
      if (createProductData?.data?.productCreate?.userErrors?.length) {
        console.error(
          "❌ Product Creation Error:",
          createProductData.data.productCreate.userErrors,
        );
        return new Response(
          JSON.stringify({
            error: "Failed to create product",
            details: createProductData.data.productCreate.userErrors,
          }),
          { status: 500 },
        );
      }

      productId = createProductData?.data?.productCreate?.product?.id;
      console.log("✅ Created new Shipping Protection product:", productId);
    }

    // Step 5: Create Variant if Not Exists
    if (!variantId) {
      console.log("❌ No variant found. Creating a new variant...");

      const createVariantMutation = `
        mutation CreateProductVariant($variants: [ProductVariantsBulkInput!]!) {
          productVariantsBulkCreate(variants: $variants) {
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
          variants: [
            {
              productId: productId, // ✅ Ensure correct product ID format
              title: "Shipping Protection",
              price: protectionFee.toFixed(2),
              sku: "SHIPPING-PROTECTION",
              inventoryManagement: "NOT_MANAGED",
            },
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

    // Step 6: Create Shopify Script Tag
    if (variantId) {
      console.log("✅ Using Variant ID:", variantId);
      const createScriptTagMutation = `
        mutation CreateScriptTag($input: ScriptTagInput!) {
          scriptTagCreate(input: $input) {
            scriptTag { id }
            userErrors { field message }
          }
        }
      `;

      const scriptVariables = {
        input: {
          src: `${process.env.SHOPIFY_APP_URL}/shipping-protection.js?variantId=${variantId}`,
          displayScope: "ALL",
        },
      };

      const scriptResponse = await admin.graphql(createScriptTagMutation, {
        variables: scriptVariables,
      });

      const scriptData = await scriptResponse.json();
      if (scriptData?.data?.scriptTagCreate?.userErrors?.length) {
        console.error(
          "❌ Script Tag Error:",
          scriptData.data.scriptTagCreate.userErrors,
        );
        return new Response(
          JSON.stringify({
            error: "Failed to create script tag",
            details: scriptData.data.scriptTagCreate.userErrors,
          }),
          { status: 500 },
        );
      }
      console.log("✅ ScriptTag successfully added!");
    }

    return new Response("✅ Process Completed Successfully", { status: 200 });
  } catch (error) {
    console.error("❌ Unexpected Error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        details: error.message || "Unknown error occurred",
      }),
      { status: 500 },
    );
  }
};
