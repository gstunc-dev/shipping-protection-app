import { useEffect, useState, useCallback } from "react";
import { Card, TextField, Button, List, Text, Frame, Toast } from "@shopify/polaris";

export default function Upsells() {
  const [upsells, setUpsells] = useState([]);
  const [newUpsell, setNewUpsell] = useState({ name: "", price: "" });
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, error = false) => {
    setToast({ message, error });
  }, []);

  useEffect(() => {
    const fetchUpsells = async () => {
      try {
        const response = await fetch("/api/fetchUpsell");
        const data = await response.json();
        if (data.upsells) {
          setUpsells(data.upsells);
          showToast("Upsells loaded successfully");
        } else {
          showToast("No upsells found", true);
        }
      } catch (error) {
        showToast("Error fetching upsells", true);
      }
    };
    fetchUpsells();
  }, [showToast]);

  const addUpsell = async () => {
    if (!newUpsell.name || !newUpsell.price) {
      showToast("Please fill in all fields", true);
      return;
    }
  
    try {
      const response = await fetch("/api/addUpsell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUpsell),
      });
  
      const data = await response.json();
console.log(data)
      if (data.success && data.productId) {
        setUpsells((prevUpsells) => [
          ...prevUpsells,
          { id: data.productId, name: newUpsell.name, price: newUpsell.price, status: "active" },
        ]);
        setNewUpsell({ name: "", price: "" });
        setShowForm(false);
        showToast(data.message || "Upsell added successfully ✅");
      } else {
        showToast(data.message || "Failed to add upsell ❌", true);
      }
    } catch (error) {
      showToast(error.message || "An error occurred while adding the upsell ❌", true);
    }
  };
  
  

  const toggleStatus = async (id) => {
    try {
      const updatedUpsells = upsells.map((upsell) =>
        upsell.id === id
          ? { ...upsell, status: upsell.status === "active" ? "inactive" : "active" }
          : upsell
      );
      setUpsells(updatedUpsells);
      
      const response = await fetch("/api/toggleUpsell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      const data = await response.json();
      if (data.success) {
        showToast("Upsell status updated");
      } else {
        showToast("Failed to update status", true);
      }
    } catch (error) {
      showToast("Error updating status", true);
    }
  };

  return (
    <Frame>
      <Card sectioned>
        <Text variant="headingMd" as="h2">Add Upsells</Text>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "Show Add Form"}
        </Button>
        {showForm && (
          <div style={{ display: "flex", gap: "10px", marginBottom: "20px", marginTop: "10px" }}>
            <TextField
              label="Upsell Name"
              value={newUpsell.name}
              onChange={(value) => setNewUpsell({ ...newUpsell, name: value })}
              autoComplete="off"
            />
            <TextField
              label="Price"
              type="number"
              value={newUpsell.price}
              onChange={(value) => setNewUpsell({ ...newUpsell, price: value })}
              autoComplete="off"
            />
            <Button primary onClick={addUpsell}>Add Upsell</Button>
          </div>
        )}
        <div>
          <List>
            {upsells.map((upsell) => (
              <List.Item key={upsell.id}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px",
                    background: "#f9f9f9",
                    borderRadius: "8px",
                    marginBottom: "10px",
                    boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)",
                  }}
                >
                  <Text variant="bodyMd" as="p" style={{ fontWeight: "bold" }}>
                    {upsell.name}
                  </Text>
                  <Text variant="bodyMd" as="p" style={{ color: "#5c6ac4" }}>
                    ${upsell.price}
                  </Text>
                  <Button
                    onClick={() => toggleStatus(upsell.id)}
                    destructive={upsell.status === "inactive"}
                    primary={upsell.status === "active"}
                  >
                    {upsell.status === "active" ? "Deactivate" : "Activate"}
                  </Button>
                </div>
              </List.Item>
            ))}
          </List>
        </div>
      </Card>
      {toast && (
        <Toast content={toast.message} error={toast.error} onDismiss={() => setToast(null)} />
      )}
    </Frame>
  );
}
