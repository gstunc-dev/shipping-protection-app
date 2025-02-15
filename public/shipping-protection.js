(function () {
  console.log("✅ Checking script position...");
  let shop;
  let SHIPPING_PROTECTION_VARIANT_ID;
  let SHIPPING_PROTECTION_VARIANT_PRICE; // Dynamically updated price

  function moveScriptToBody() {
    let scriptTag = document.querySelector('script[src*="shipping-protection.js"]');

    if (scriptTag && scriptTag.parentNode !== document.body) {
      console.log("🚀 Moving script to body...");
      document.body.appendChild(scriptTag);
    }

    const url = new URL(scriptTag.src);
    shop = url.search.split("&")[1].split("=")[1];
    SHIPPING_PROTECTION_VARIANT_ID = url.search.split("&")[0].split("=")[1].split("/")[4];

    fetchVariantPrice().then((variantPrice) => {
      if (!variantPrice) {
        console.warn("⚠️ Failed to fetch Shipping Protection variant price.");
        return;
      }
      SHIPPING_PROTECTION_VARIANT_PRICE = parseFloat(variantPrice);

      applyCartCtasStyle();

      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => runShippingProtectionScript());
      } else {
        runShippingProtectionScript();
      }
    });
  }

  // ✅ Fetch the correct price of the Shipping Protection variant
  async function fetchVariantPrice() {
    try {
      const response = await fetch(`/variants/${SHIPPING_PROTECTION_VARIANT_ID}.json`);
      const data = await response.json();
      // const variant = data.product?.variants.find(v => v.id == SHIPPING_PROTECTION_VARIANT_ID);
      // return variant ? variant.price : 0;
      // SHIPPING_PROTECTION_VARIANT_PRICE = parseFloat(data.product_variant.price);
      return data.product_variant.price
    } catch (error) {
      console.error("❌ Error fetching variant price:", error);
      return 0;
    }
  }

  function applyCartCtasStyle() {
    let cartCtas = document.querySelector(".cart__ctas");
    if (cartCtas) {
      console.log("🎨 Applying `flex-direction: column;` to `.cart__ctas`");
      cartCtas.style.display = "flex";
      cartCtas.style.flexDirection = "column";
    }
  }

  function runShippingProtectionScript() {
    console.log("✅ Shipping Protection Script Running Inside <body>");

    function insertToggle() {
      let checkoutButton = document.querySelector(".cart__checkout, .checkout-button, button[name='checkout']");
      if (!checkoutButton) {
        console.warn("⚠️ Checkout button not found, retrying...");
        setTimeout(insertToggle, 500);
        return;
      }

      if (document.getElementById("shipping-protection-container")) return;

      let container = document.createElement("div");
      container.id = "shipping-protection-container";
      container.style.display = "flex";
      container.style.justifyContent = "space-between";
      container.style.alignItems = "center";
      container.style.padding = "12px";
      container.style.border = "1px solid #ddd";
      container.style.borderRadius = "8px";
      container.style.marginBottom = "15px";
      container.style.background = "#f8f8f8";

      let label = document.createElement("label");
      label.innerHTML = `Add Shipping Protection for <b>$${SHIPPING_PROTECTION_VARIANT_PRICE.toFixed(2)}</b>`;
      label.style.flex = "1";

      let toggleWrapper = document.createElement("div");
      toggleWrapper.style.position = "relative";
      toggleWrapper.style.width = "50px";
      toggleWrapper.style.height = "25px";
      toggleWrapper.style.background = "#ccc";
      toggleWrapper.style.borderRadius = "25px";
      toggleWrapper.style.cursor = "pointer";
      toggleWrapper.style.transition = "background 0.3s ease-in-out";

      let toggleCircle = document.createElement("div");
      toggleCircle.style.position = "absolute";
      toggleCircle.style.top = "2px";
      toggleCircle.style.left = "2px";
      toggleCircle.style.width = "21px";
      toggleCircle.style.height = "21px";
      toggleCircle.style.background = "#fff";
      toggleCircle.style.borderRadius = "50%";
      toggleCircle.style.transition = "left 0.3s ease-in-out, box-shadow 0.2s";
      toggleCircle.style.boxShadow = "0px 2px 5px rgba(0, 0, 0, 0.2)";

      toggleWrapper.appendChild(toggleCircle);

      fetch("/cart.js")
        .then((res) => res.json())
        .then((cart) => {
          let protectionItem = cart.items.find(item => item.variant_id == SHIPPING_PROTECTION_VARIANT_ID);
          updateToggle(!!protectionItem);
        });

      function updateToggle(isChecked) {
        if (isChecked) {
          toggleWrapper.style.background = "#4CAF50";
          toggleCircle.style.left = "26px";
          toggleCircle.style.boxShadow = "0px 3px 8px rgba(0, 0, 0, 0.3)";
        } else {
          toggleWrapper.style.background = "#ccc";
          toggleCircle.style.left = "2px";
          toggleCircle.style.boxShadow = "0px 2px 5px rgba(0, 0, 0, 0.2)";
        }
      }

      toggleWrapper.addEventListener("click", function () {
        let isChecked = toggleWrapper.style.background === "rgb(76, 175, 80)";
        updateToggle(!isChecked);
        if (!isChecked) {
          addProtectionFee();
        } else {
          removeProtectionFee();
        }
      });

      container.appendChild(label);
      container.appendChild(toggleWrapper);

      checkoutButton.parentNode.insertBefore(container, checkoutButton);
    }

    function addProtectionFee() {
      fetch("/cart/add.js", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{
            id: SHIPPING_PROTECTION_VARIANT_ID,
            quantity: 1,
            properties: {
              ShippingProtection: "true",
              ProtectionFee: SHIPPING_PROTECTION_VARIANT_PRICE
            }
          }]
        }),
      })
        .then(() => {
          console.log("✅ Shipping Protection Added");
          updateCartSubtotal();
        })
        .catch((err) => console.error("❌ Error:", err));
    }

    function removeProtectionFee() {
      fetch("/cart.js")
        .then((res) => res.json())
        .then((cart) => {
          let protectionItem = cart.items.find(item => item.variant_id == SHIPPING_PROTECTION_VARIANT_ID);
          if (protectionItem) {
            fetch("/cart/change.js", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id: protectionItem.key,
                quantity: 0
              }),
            })
              .then(() => {
                console.log("✅ Shipping Protection Removed");
                updateCartSubtotal();
              })
              .catch((err) => console.error("❌ Error:", err));
          }
        });
    }

    function updateCartSubtotal() {
      fetch("/cart.js")
        .then((res) => res.json())
        .then((cart) => {
          let subtotal = cart.total_price / 100;
          let cartSubtotalElement = document.querySelector(".totals__subtotal-value, .cart-total-price");
          if (cartSubtotalElement) {
            cartSubtotalElement.innerText = `$${subtotal.toFixed(2)}`;
          }
        });
    }

    insertToggle();

    const observer = new MutationObserver(insertToggle);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  moveScriptToBody();
})();
