import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useNavigate, // Import useNavigate
} from "@remix-run/react";
import { useEffect } from "react"; // Import useEffect
// import { getSessionToken } from "@shopify/app-bridge-utils"; // Import getSessionToken
import { useAppBridge } from "@shopify/app-bridge-react"; // Import useAppBridge

export default function App() {
  const navigate = useNavigate(); // Initialize useNavigate
  const app = useAppBridge(); // Initialize useAppBridge

  useEffect(() => {
    async function initializeAppBridge() {
      if (!app) return; // Check if app bridge is initialized

      app.subscribe("APP::RELOAD", async () => {
        // const sessionToken = await getSessionToken(app);
        // if (sessionToken) {
        window.location.href = `${window.location.origin}${window.location.pathname}?shopify-reload=${encodeURIComponent(sessionToken)}`;
        // } else {
        //   navigate("."); // Fallback navigation
        // }
      });
    }

    initializeAppBridge();
  }, [app, navigate]); // Add app and navigate to dependency array

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="preconnect" href="https://cdn.shopify.com/" />
        <link
          rel="stylesheet"
          href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

