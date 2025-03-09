import { PassThrough } from "stream";
import { renderToPipeableStream } from "react-dom/server";
import { RemixServer } from "@remix-run/react";
import { createReadableStreamFromReadable } from "@remix-run/node";
import { isbot } from "isbot";
import { addDocumentResponseHeaders } from "./shopify.server";

export const streamTimeout = 5000;

export default async function handleRequest(
  request,
  responseStatusCode,
  responseHeaders,
  remixContext,
) {
  addDocumentResponseHeaders(request, responseHeaders);
  
  // ✅ Handle CORS
  const allowedOrigin = "*";
  responseHeaders.set("Access-Control-Allow-Origin", allowedOrigin);
  responseHeaders.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  responseHeaders.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // ✅ Handle Preflight CORS Requests (OPTIONS)
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204, // No Content
      headers: responseHeaders,
    });
  }

  const userAgent = request.headers.get("user-agent");
  const callbackName = isbot(userAgent ?? "") ? "onAllReady" : "onShellReady";

  return new Promise((resolve, reject) => {
    const { pipe, abort } = renderToPipeableStream(
      <RemixServer context={remixContext} url={request.url} />,
      {
        [callbackName]: () => {
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);

          responseHeaders.set("Content-Type", "text/html");
          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode,
            }),
          );
          pipe(body);
        },
        onShellError(error) {
          reject(error);
        },
        onError(error) {
          responseStatusCode = 500;
          console.error(error);
        },
      },
    );

    // ✅ Auto-timeout React renderer after 6 seconds
    setTimeout(abort, streamTimeout + 1000);
  });
}
