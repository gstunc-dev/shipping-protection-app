import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { authenticate } from "../shopify.server";
import { Page, Layout, Card, TextContainer, Button } from "@shopify/polaris";
import { useEffect } from "react";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  return { apiKey: process.env.SHOPIFY_API_KEY || "", shop: session.shop };
};

export default function App() {
  const { apiKey, shop } = useLoaderData();

  // Call install API on component mount
  useEffect(() => {
    fetch(`/api/install`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    })
      .then((res) => res.json())
      .then((data) => console.log(data));
  }, []);

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <NavMenu>
        <Link to="/app" rel="home">
          Home
        </Link>
      </NavMenu>

      <Page title="Shipping Protection">
        <Layout>
          <Layout.Section>
            <Card title="How This App Works" sectioned>
              <TextContainer>
                <p>
                  1️⃣ After installing the application, a{" "}
                  <b>Shipping Protection</b> product is automatically created in
                  your product list. You can update its price as needed.
                </p>
                <p>
                  2️⃣ When the customer enables the toggle on the cart page, the
                  shipping protection fee is applied dynamically at checkout.
                </p>
              </TextContainer>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>

      <Outlet />
    </AppProvider>
  );
}

// Shopify needs Remix to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
