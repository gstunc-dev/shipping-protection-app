import shopify from "../shopify.server";
import prisma from "../db.server";
import { parseStringPromise } from "xml2js";
const table = prisma.upsell;

export async function action({ request }) {
  try {
    const { session, admin } = await shopify.authenticate.admin(request);
    const shop = session.shop;
    console.log(`✅ Authenticated shop: ${shop} with scope: ${session.scope}`);

    const formData = await request.formData();
    const name = formData.get("name");
    const price = formData.get("price");
    const description = formData.get("description");
    const imageFile = formData.get("image");

    if (!name || !price || !description) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: name, price, or description",
        }),
        { status: 400 }
      );
    }

    const query = `
      query {
        products(first: 1, query: "title:${name}") {
          edges { node { id title handle } }
        }
      }
    `;

    const response = await admin.graphql(query);
    const data = await response.json();

    if (!data || !data.data) {
      return new Response(
        JSON.stringify({ error: "Invalid Shopify response" }),
        { status: 500 }
      );
    }

    const existingProduct = data?.data?.products?.edges?.[0]?.node;
    let productId;
    let productHandle;
    let imageUrl = null;

    if (existingProduct) {
      productId = existingProduct.id;
      productHandle = existingProduct.handle;
      return new Response(
        JSON.stringify({ message: `Product already exists` }),
        { status: 500 }
      );
    } else {
      console.log(`ℹ️ No existing product found. Creating a new one...`);

      const createProductMutation = `
        mutation CreateProduct($input: ProductInput!) {
          productCreate(input: $input) {
            product {
              id
              title
              handle
              productType
              descriptionHtml
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const createProductResponse = await admin.graphql(createProductMutation, {
        variables: {
          input: {
            title: name,
            productType: "Service",
            status: "ACTIVE",
            published: true,
            descriptionHtml: description,
          },
        },
      });

      const createProductData = await createProductResponse.json();
      productId = createProductData?.data?.productCreate?.product?.id;
      productHandle = createProductData?.data?.productCreate?.product?.handle;
      console.log("✅ Created new product:", productId);
    }

    if (productId && imageFile) {
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
      const uploadTarget =
        uploadData?.data?.stagedUploadsCreate?.stagedTargets?.[0];

      if (!uploadTarget) {
        return new Response(
          JSON.stringify({ error: "Shopify upload URL not found" }),
          { status: 500 }
        );
      }

      const uploadUrl = uploadTarget.url;
      const resourceUrl = uploadTarget.resourceUrl;
      const formDataUpload = new FormData();
      uploadTarget.parameters.forEach((param) => {
        formDataUpload.append(param.name, param.value);
      });
      const arrayBuffer = await imageFile.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: imageFile.type });
      formDataUpload.append("file", blob, imageFile.name);

      const fileUploadResponse = await fetch(uploadUrl, {
        method: "POST",
        body: formDataUpload,
        headers: { Accept: "*/*" },
      });

      const uploadResultText = await fileUploadResponse.text();
      try {
        const parsedXml = await parseStringPromise(uploadResultText);
        imageUrl = parsedXml?.PostResponse?.Location?.[0] || "URL_NOT_FOUND";
      } catch (error) {
        console.log("❌ Error parsing XML response:", error);
      }
    }

    await table.create({
      data: {
        shop,
        name,
        price: parseFloat(price),
        description,
        productId,
        imageUrl,
      },
    });
    console.log("✅ Upsell saved to database");

    const createVariantMutation = `
      mutation CreateProductVariant($productId: ID!,$variants: [ProductVariantsBulkInput!]!) {
        productVariantsBulkCreate(productId: $productId, variants: $variants, strategy: REMOVE_STANDALONE_VARIANT) {
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
        productId: productId,
        variants: [
          {
            optionValues: [],
            price: parseFloat(price),
            inventoryItem: {
              requiresShipping: false,
              tracked: false,
            },
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
        createVariantData.data.productVariantsBulkCreate.userErrors
      );
    }
    console.log("✅ Product variant created");

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
        src: `${process.env.SHOPIFY_APP_URL}/shipping-protection.js?variantId=${productId}&productHandle=${productHandle}`,
        displayScope: "ALL",
      },
    };

    await admin.graphql(createScriptTagMutation, {
      variables: scriptVariables,
    });
    console.log("✅ Script tag created");

    return new Response(
      JSON.stringify({ success: true, productId, productHandle, imageUrl }),
      { status: 200 }
    );
  } catch (error) {
    console.error(`❌ Unexpected error`, error);
    return new Response(
      JSON.stringify({
        error: "Failed to process request",
        details: error.message,
      }),
      { status: 500 }
    );
  }
}
