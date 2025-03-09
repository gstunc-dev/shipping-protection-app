import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  try {
    const payload = await request.json();
    const shop = payload.domain;

    console.log(`🚀 App Uninstalled for Shop: ${shop}`);

    // Authenticate as admin
    const { admin } = await authenticate.adminByShop(shop);

    // Step 1: Find and Delete the "Shipping Protection" Product
    const productQuery = `
      query {
        products(first: 1, query: "title:Shipping Protection") {
          edges {
            node {
              id
            }
          }
        }
      }
    `;

    const response = await admin.graphql(productQuery);
    const data = await response.json();
    const productEdges = data?.data?.products?.edges || [];
    let productId = productEdges?.[0]?.node?.id;

    if (productId) {
      console.log(`🗑️ Deleting Product ID: ${productId}`);

      const deleteProductMutation = `
        mutation DeleteProduct($input: ProductDeleteInput!) {
          productDelete(input: $input) {
            deletedProductId
            userErrors {
              field
              message
            }
          }
        }
      `;

      const deleteResponse = await admin.graphql(deleteProductMutation, {
        variables: { input: { id: productId } },
      });

      const deleteData = await deleteResponse.json();
      if (deleteData?.data?.productDelete?.userErrors?.length) {
        console.error(
          "❌ Product Deletion Error:",
          deleteData.data.productDelete.userErrors,
        );
      } else {
        console.log("✅ Shipping Protection Product Deleted");
      }
    } else {
      console.log(
        "⚠️ No Shipping Protection product found, nothing to delete.",
      );
    }

    // Step 2: Find and Remove the Script Tag
    console.log("🔍 Checking for existing script tag...");
    const scriptQuery = `
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

    const scriptResponse = await admin.graphql(scriptQuery);
    const scriptData = await scriptResponse.json();
    const existingScript = scriptData?.data?.scriptTags?.edges?.find((edge) =>
      edge.node.src.includes("shipping-protection.js"),
    );

    if (existingScript) {
      const scriptId = existingScript.node.id;
      console.log(`🗑️ Removing Script Tag ID: ${scriptId}`);

      const deleteScriptMutation = `
        mutation DeleteScriptTag($id: ID!) {
          scriptTagDelete(id: $id) {
            deletedScriptTagId
            userErrors {
              field
              message
            }
          }
        }
      `;

      const deleteScriptResponse = await admin.graphql(deleteScriptMutation, {
        variables: { id: scriptId },
      });

      const deleteScriptData = await deleteScriptResponse.json();
      if (deleteScriptData?.data?.scriptTagDelete?.userErrors?.length) {
        console.error(
          "❌ Script Tag Deletion Error:",
          deleteScriptData.data.scriptTagDelete.userErrors,
        );
      } else {
        console.log("✅ Script Tag Successfully Deleted!");
      }
    } else {
      console.log("⚠️ No script tag found, nothing to remove.");
    }

    return json({ message: "Product and script removed successfully" });
  } catch (error) {
    console.error("❌ Error handling uninstall webhook:", error);
    return json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 },
    );
  }
};
