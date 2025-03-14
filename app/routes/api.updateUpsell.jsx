import shopify from "../shopify.server";
import prisma from "../db.server";
import { parseStringPromise } from "xml2js";
import { URL } from "url"; // Node.js URL API for parsing query parameters

const table = prisma.upsell;

export async function action({ request }) {
  try {
    // Step 1: Authenticate Admin
    const { session, admin } = await shopify.authenticate.admin(request);
    const shop = session.shop;
    console.log(`✅ Authenticated shop: ${shop} with scope: ${session.scope}`);

    // ✅ Extract upsellId from URL query parameters
    const url = new URL(request.url);
    const upsellId = url.searchParams.get("upsellid"); // Extract upsell ID from query string

    // ✅ Parse request data
    const formData = await request.formData();
    const name = formData.get("name");
    const price = formData.get("price");
    const imageFile = formData.get("image");
    const description = formData.get("description");

    if (!upsellId || !name || !price) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: upsellId, name, or price",
        }),
        { status: 400 }
      );
    }

    // ✅ Step 2: Find Existing Upsell in DB
    const existingUpsell = await table.findUnique({
      where: { id: upsellId },
    });

    if (!existingUpsell) {
      return new Response(JSON.stringify({ error: "Upsell not found" }), {
        status: 404,
      });
    }

    const productId = existingUpsell.productId;
    let imageUrl = existingUpsell.imageUrl;

    console.log(`🔄 Updating upsell ${upsellId} for product ${productId}`);

    // ✅ Step 3: Update Shopify Product Title
    console.log("📢 Updating product title in Shopify...");
    const updateProductMutation = `
      mutation updateProduct($input: ProductInput!) {
        productUpdate(input: $input) {
          product {
            id
            title
            descriptionHtml
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const updateProductResponse = await admin.graphql(updateProductMutation, {
      variables: {
        input: {
          id: productId,
          title: name, // ✅ Only updating the product title
          descriptionHtml: description,
        },
      },
    });

    const updatedProductData = await updateProductResponse.json();
    console.log(
      "✅ Product title update response:",
      JSON.stringify(updatedProductData, null, 2)
    );

    if (updatedProductData?.data?.productUpdate?.userErrors?.length) {
      console.error(
        "❌ Shopify Product Update Errors:",
        updatedProductData.data.productUpdate.userErrors
      );
    }

    // ✅ Step 4: Update Shopify Variant Price
    console.log("📢 Updating variant price in Shopify...");

    // Fetch product variants to get variant ID
    const fetchVariantsQuery = `
      query getProductVariants($productId: ID!) {
        product(id: $productId) {
          variants(first: 1) {
            edges {
              node {
                id
              }
            }
          }
        }
      }
    `;

    const fetchVariantsResponse = await admin.graphql(fetchVariantsQuery, {
      variables: { productId },
    });
    const variant = await fetchVariantsResponse.json();
    console.log(variant);
    const variantId = variant?.data?.product?.variants?.edges?.[0]?.node?.id;

    if (!variantId) {
      console.error("❌ No variant found for the product");
      return new Response(
        JSON.stringify({ error: "No variant found for the product" }),
        { status: 500 }
      );
    }

    // ✅ Update Variant Price
    // ✅ Update Variant Price (Using productVariantsBulkUpdate)
    const updateVariantMutation = `
      mutation updateProductVariants($variants: [ProductVariantsBulkInput!]!) {
        productVariantsBulkUpdate(productId: "${productId}", variants: $variants) {
          product {
            id
          }
          productVariants {
            id
            price
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const updateVariantResponse = await admin.graphql(updateVariantMutation, {
      variables: {
        variants: [
          {
            id: variantId,
            price: parseFloat(price), // ✅ Updating price separately
          },
        ],
      },
    });

    const updatedVariantData = await updateVariantResponse.json();
    console.log(
      "✅ Variant price update response:",
      JSON.stringify(updatedVariantData, null, 2)
    );

    if (
      updatedVariantData?.data?.productVariantsBulkUpdate?.userErrors?.length
    ) {
      console.error(
        "❌ Shopify Variant Update Errors:",
        updatedVariantData.data.productVariantsBulkUpdate.userErrors
      );
    }

    // ✅ Step 5: Upload Image to Shopify (if new image provided)
    if (imageFile) {
      console.log("📤 Uploading new image to Shopify...");
      const imageUploadMutation = `
        mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
          stagedUploadsCreate(input: $input) {
            stagedTargets {
              url
              resourceUrl
              parameters {
                name
                value
              }
            }
          }
        }
      `;

      const uploadResponse = await admin.graphql(imageUploadMutation, {
        variables: {
          input: [
            {
              resource: "FILE",
              filename: imageFile.name,
              mimeType: imageFile.type,
              fileSize: imageFile.size.toString(),
              httpMethod: "POST",
            },
          ],
        },
      });

      const uploadData = await uploadResponse.json();
      console.log(
        "📤 Shopify stagedUploadsCreate Response:",
        JSON.stringify(uploadData, null, 2)
      );

      const uploadTarget =
        uploadData?.data?.stagedUploadsCreate?.stagedTargets?.[0];
      if (!uploadTarget) {
        return new Response(
          JSON.stringify({ error: "Failed to get upload URL from Shopify" }),
          { status: 500 }
        );
      }

      const uploadUrl = uploadTarget.url;
      console.log(`✅ Shopify upload URL: ${uploadUrl}`);

      // ✅ Upload Image to Google Cloud Storage (via Shopify)
      const formDataUpload = new FormData();
      uploadTarget.parameters.forEach((param) =>
        formDataUpload.append(param.name, param.value)
      );

      const arrayBuffer = await imageFile.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: imageFile.type });
      formDataUpload.append("file", blob, imageFile.name);

      const fileUploadResponse = await fetch(uploadUrl, {
        method: "POST",
        body: formDataUpload,
      });

      if (!fileUploadResponse.ok) {
        return new Response(JSON.stringify({ error: "Image upload failed" }), {
          status: 500,
        });
      }

      console.log("✅ Image successfully uploaded!");

      // ✅ Step 6: Attach Image to Product
      const productCreateMediaMutation = `
        mutation productCreateMedia($productId: ID!, $media: [CreateMediaInput!]!) {
          productCreateMedia(productId: $productId, media: $media) {
            media {
              id
              preview {
                status
              }
              ... on MediaImage {
                image {
                  url
                }
              }
            }
            mediaUserErrors {
              field
              message
            }
          }
        }
      `;

      await admin.graphql(productCreateMediaMutation, {
        variables: {
          productId: productId,
          media: [
            {
              originalSource: uploadTarget.resourceUrl,
              mediaContentType: "IMAGE",
            },
          ],
        },
      });

      imageUrl = uploadTarget.resourceUrl;
    }

    // ✅ Step 7: Update Upsell in Database
    const updatedUpsell = await table.update({
      where: { id: upsellId },
      data: {
        name,
        price: parseFloat(price),
        imageUrl,
      },
    });

    console.log("✅ Upsell updated in database:", updatedUpsell);

    return new Response(JSON.stringify({ success: true, updatedUpsell }), {
      status: 200,
    });
  } catch (error) {
    console.error("❌ Unexpected error", error);
    return new Response(
      JSON.stringify({
        error: "Failed to update upsell",
        details: error.message,
      }),
      { status: 500 }
    );
  }
}
