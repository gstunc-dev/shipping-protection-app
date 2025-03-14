(function () {
  if (!window.__SHIPPING_PROTECTION_VARIANTS__) {
    window.__SHIPPING_PROTECTION_VARIANTS__ = new Set();
  }
  
  if (!window.__SHIPPING_PROTECTION_DATA__) {
    window.__SHIPPING_PROTECTION_DATA__ = {}; // Store variant-specific data
  }

  console.log("✅ Checking script position...");
  let shop;

 function moveScriptToBody() {
   let scriptTags = document.querySelectorAll(
     'script[src*="shipping-protection.js"]'
   );
   scriptTags.forEach((scriptTag) => {
     if (scriptTag.parentNode !== document.body) {
       console.log("🚀 Moving script to body...");
       document.body.appendChild(scriptTag);
     }

     const url = new URL(scriptTag.src);
     const params = new URLSearchParams(url.search);
     console.log(url.search.split("&")[1].split("=")[1]);
     let variantId = url.search.split("&")[0].split("=")[1].split("/")[4];
     let productHandle = url.search.split("&")[1].split("=")[1]; // ✅ Extracting product handle

     if (!variantId) {
       console.error(
         "❌ Missing SHIPPING_PROTECTION_VARIANT_ID in script URL."
       );
       return;
     }

     if (window.__SHIPPING_PROTECTION_VARIANTS__.has(variantId)) {
       console.warn(
         "⚠️ Shipping Protection already initialized for variant",
         variantId
       );
       return;
     }

     window.__SHIPPING_PROTECTION_VARIANTS__.add(variantId);

     fetchVariantDetails(variantId, productHandle).then(
       ({ price, name, image, description }) => {
         if (!price) {
           console.warn(
             "⚠️ Failed to fetch Shipping Protection variant price."
           );
           return;
         }

         window.__SHIPPING_PROTECTION_DATA__[variantId] = {
           price: parseFloat(price),
           name,
           image,
           description,
         };

         applyCartCtasStyle();

         if (document.readyState === "loading") {
           document.addEventListener("DOMContentLoaded", () =>
             runShippingProtectionScript(variantId)
           );
         } else {
           runShippingProtectionScript(variantId);
         }
       }
     );
   });
 }

 async function fetchVariantDetails(variantId, productHandle) {
   try {
     // Fetch variant details
     //  const variantResponse = await fetch(`/variants/${variantId}.json`);
     //  const variantData = await variantResponse.json();

     //  if (!variantData.product_variant) {
     //    throw new Error("Variant data not found.");
     //  }

     // Fetch product details using the product ID
     const productResponse = await fetch(`/products/${productHandle}.json`);
     const productData = await productResponse.json();

     if (!productData.product) {
       throw new Error("Product data not found.");
     }

     const productName = productData.product.title;
     const price = productData.product.variants[0].price;
     const productImage =
       productData.product.images.length > 0
         ? productData.product.images[0].src
         : "";
     const productDescription = productData.product.body_html;
     return {
       price: parseFloat(price),
       name: productName,
       image: productImage,
       description: productDescription,
     };
   } catch (error) {
     console.error("❌ Error fetching variant details:", error);
     return { price: 0, name: "Unknown Product", image: "" };
   }
 }

 function applyCartCtasStyle() {
   function setStyle() {
     let cartCtas = document.querySelector(".cart__ctas");
     if (cartCtas) {
       cartCtas.style.display = "flex";
       cartCtas.style.flexDirection = "column";
     } else {
       setTimeout(setStyle, 500);
     }
   }

   if (document.readyState === "loading") {
     document.addEventListener("DOMContentLoaded", setStyle);
   } else {
     setStyle();
   }
 }

 function runShippingProtectionScript(variantId) {
   console.log("✅ Running Shipping Protection Script for variant:", variantId);

   let checkoutButton = document.querySelector(
     ".cart__checkout, .checkout-button, button[name='checkout']"
   );
   if (!checkoutButton) {
     setTimeout(() => runShippingProtectionScript(variantId), 500);
     return;
   }
   function injectToggleStyles() {
     if (document.getElementById("toggle-switch-styles")) return;

     let style = document.createElement("style");
     style.id = "toggle-switch-styles";
     style.innerHTML = `
            .switch {
              position: relative;
              display: inline-block;
              width: 51px;
              height: 25px;
            }

            .switch input {
              opacity: 0;
              width: 0;
              height: 0;
            }

            .slider {
              position: absolute;
              cursor: pointer;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background-color: #ccc;
              -webkit-transition: .4s;
              transition: .4s;
            }

            .slider:before {
              position: absolute;
              content: "";
              height: 19px;
              width: 19px;
              left: 3px;
              bottom: 3px;
              background-color: white;
              -webkit-transition: .4s;
              transition: .4s;
            }

            input:checked + .slider {
              background-color: #008000;
            }

            input:focus + .slider {
              box-shadow: 0 0 1px #008000;
            }

            input:checked + .slider:before {
              -webkit-transform: translateX(26px);
              -ms-transform: translateX(26px);
              transform: translateX(26px);
            }

            /* Rounded sliders */
            .slider.round {
              border-radius: 34px;
            }

            .slider.round:before {
              border-radius: 50%;
            }
        `;
     document.head.appendChild(style);
   }

   injectToggleStyles();
   let price = window.__SHIPPING_PROTECTION_DATA__[variantId].price || 0;
   let name = window.__SHIPPING_PROTECTION_DATA__[variantId].name;
   let image = window.__SHIPPING_PROTECTION_DATA__[variantId].image;
   let description = window.__SHIPPING_PROTECTION_DATA__[variantId].description;
   let container = document.createElement("div");
   container.id = `shipping-protection-container-${variantId}`;
   container.style.display = "flex";
   container.style.justifyContent = "space-between";
   container.style.alignItems = "center";
   container.style.padding = "12px";
   container.style.border = "1px solid #ddd";
   container.style.borderRadius = "8px";
   container.style.marginBottom = "15px";
   container.style.background = "#f8f8f8";
   let productImage = document.createElement("img");
   productImage.src = image;
   productImage.alt = name;
   productImage.style.width = "60px"; // Adjust size as needed
   productImage.style.height = "60px";
   productImage.style.borderRadius = "5px";
   productImage.style.marginRight = "10px";
   let textContainer = document.createElement("div");
   textContainer.style.display = "flex";
   textContainer.style.flexDirection = "column";
   textContainer.style.textAlign = "left";
   textContainer.style.width = "243px";

   let label = document.createElement("label");
   label.innerHTML = `<b>${name}</b> for <b>$${price}</b>`;
   label.style.fontSize = "14px";

   let descriptionElement = document.createElement("p");
   descriptionElement.innerHTML = description;
   descriptionElement.style.fontSize = "12px";
   descriptionElement.style.color = "#555";
   descriptionElement.style.margin = 0;

   textContainer.appendChild(label);
   textContainer.appendChild(descriptionElement);
   let toggleWrapper = document.createElement("label");
   toggleWrapper.classList.add("switch");

   let toggleInput = document.createElement("input");
   toggleInput.type = "checkbox";
   toggleInput.id = `shipping-protection-toggle-${variantId}`;

   let toggleSlider = document.createElement("span");
   toggleSlider.classList.add("slider", "round");

   toggleWrapper.appendChild(toggleInput);
   toggleWrapper.appendChild(toggleSlider);

   fetch("/cart.js")
     .then((res) => res.json())
     .then((cart) => {
       let protectionItem = cart.items.find(
         (item) => item.variant_id == variantId
       );
       toggleInput.checked = !!protectionItem;
     });

   toggleInput.addEventListener("change", function () {
     if (toggleInput.checked) {
       addProtectionFee(variantId);
     } else {
       removeProtectionFee(variantId);
     }
   });
   container.appendChild(productImage);
   container.appendChild(textContainer);
   container.appendChild(toggleWrapper);
   checkoutButton.parentNode.insertBefore(container, checkoutButton);
 }

  function addProtectionFee(variantId) {
    let price = window.__SHIPPING_PROTECTION_DATA__[variantId] || 0;

    fetch("/cart/add.js", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{
          id: parseInt(variantId),
          quantity: 1,
          properties: { ShippingProtection: "true", ProtectionFee: price.toString() }
        }]
      })
    })
    .then(response => {
      if (!response.ok) {
        return response.json().then(err => {
          console.error("❌ Error adding to cart:", err);
          throw new Error(`Error adding item: ${err.description}`);
        });
      }
      return response.json();
    })
    .then(() => updateCart())
    .catch(error => console.error("❌ Failed to add Shipping Protection:", error));
  }

  function removeProtectionFee(variantId) {
    fetch("/cart.js")
      .then(res => res.json())
      .then(cart => {
        let protectionItem = cart.items.find(item => item.variant_id == variantId);
        if (protectionItem) {
          fetch("/cart/change.js", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: protectionItem.key, quantity: 0 })
          }).then(() => updateCart());
        }
      })
      .catch(error => console.error("❌ Error removing Shipping Protection:", error));
  }

  function updateCart() {
    fetch("/cart.js")
      .then(res => res.json())
      .then(cart => {
        let subtotal = cart.total_price / 100;
        let cartSubtotalElement = document.querySelector(".totals__subtotal-value, .cart-total-price");
        if (cartSubtotalElement) {
          cartSubtotalElement.innerText = `$${subtotal.toFixed(2)}`;
        }
      })
      .catch(error => console.error("❌ Error updating cart:", error));
  }

  moveScriptToBody();
})();
