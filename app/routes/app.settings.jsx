import { useEffect, useState } from "react";
import {
  Page,
  Layout,
  Card,
  TextField,
  Button,
  Checkbox,
} from "@shopify/polaris";

export default function Settings() {
  const [fee, setFee] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [minOrder, setMinOrder] = useState("");

  useEffect(() => {
    fetch("/api/get-settings")
      .then((res) => res.json())
      .then((data) => {
        setFee(data.fee || "");
        setEnabled(data.enabled || false);
        setMinOrder(data.minOrder || "");
      });
  }, []);

  const handleSave = async () => {
    await fetch("/api/set-settings", {
      method: "POST",
      body: JSON.stringify({ fee, enabled, minOrder }),
      headers: { "Content-Type": "application/json" },
    });
    alert("Settings saved!");
  };

  return (
    <Page title="Settings">
      <Layout>
        <Layout.Section>
          <Card title="Shipping Protection Settings" sectioned>
            <Checkbox
              label="Enable Shipping Protection"
              checked={enabled}
              onChange={(newValue) => setEnabled(newValue)}
            />
            <TextField
              label="Protection Fee ($)"
              value={fee}
              onChange={setFee}
              type="number"
            />
            <TextField
              label="Minimum Order Amount for Protection ($)"
              value={minOrder}
              onChange={setMinOrder}
              type="number"
            />
            <Button primary onClick={handleSave} style={{ marginTop: "10px" }}>
              Save Settings
            </Button>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
