import { useEffect, useState, useCallback } from "react";
import {
  Card,
  TextField,
  Button,
  List,
  Text,
  Frame,
  Toast,
  DataTable,
} from "@shopify/polaris";

export default function Upsells() {
  const [upsells, setUpsells] = useState([]);
  const [currentUpsell, setCurrentUpsell] = useState(null); // For editing
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    description: "", // Added description field
    image: null,
  });
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, error = false) => {
    setToast({ message, error });
  }, []);
  const [add, setAdd] = useState(false);
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

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    setFormData((prev) => ({ ...prev, image: file }));
  };

  const handleEdit = (upsell) => {
    setCurrentUpsell(upsell);
    setFormData({
      name: upsell.name,
      price: upsell.price,
      description: upsell.description || "", // Set description when editing
      image: null,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.price || !formData.description) {
      showToast("Please fill in all fields", true);
      return;
    }

    const form = new FormData();
    form.append("name", formData.name);
    form.append("price", formData.price);
    form.append("description", formData.description);
    if (formData.image) {
      form.append("image", formData.image);
    }

    try {
      const response = await fetch(
        currentUpsell
          ? `/api/updateUpsell?upsellid=${currentUpsell.id}`
          : "/api/addUpsell",
        {
          method: currentUpsell ? "PUT" : "POST",
          body: form,
        }
      );

      const data = await response.json();
      if (data.success) {
        setUpsells((prevUpsells) => {
          if (currentUpsell) {
            return prevUpsells.map((u) =>
              u.id === currentUpsell.id
                ? {
                    ...u,
                    name: formData.name,
                    price: formData.price,
                    description: formData.description,
                    imageUrl: data.imageUrl || u.imageUrl,
                  }
                : u
            );
          } else {
            return [
              ...prevUpsells,
              {
                id: data.productId,
                name: formData.name,
                price: formData.price,
                description: formData.description,
                imageUrl: data.imageUrl,
                status: "active",
              },
            ];
          }
        });

        setCurrentUpsell(null);
        setFormData({ name: "", price: "", description: "", image: null });
        setShowForm(false);
        showToast(
          data.message ||
            (currentUpsell ? "Upsell updated ✅" : "Upsell added ✅")
        );
      } else {
        showToast(data.message || "Failed to save upsell ❌", true);
      }
    } catch (error) {
      showToast(error.message || "An error occurred ❌", true);
    }
  };
  const rows = upsells.map((upsell) => [
    <img
      src={upsell.imageUrl}
      alt={upsell.name}
      width="50"
      style={{ borderRadius: "5px" }}
    />,
    upsell.name,
    `$${upsell.price}`,
    upsell.description, // Display description in table
    <Button onClick={() => handleEdit(upsell)}>Edit</Button>,
  ]);
  return (
    <Frame>
      <Card sectioned>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <Text variant="headingMd" as="h2">
            {currentUpsell ? "Edit Upsell" : "Add Upsells"}
          </Text>
          <Button
            onClick={() => {
              setShowForm(!showForm);
              setCurrentUpsell(null);
              setFormData({
                name: "",
                price: "",
                description: "",
                image: null,
              });
            }}
          >
            {showForm
              ? "Cancel"
              : currentUpsell
                ? "Edit Upsell"
                : "Add New Upsell"}
          </Button>
        </div>
        {showForm && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              marginBottom: "20px",
              marginTop: "10px",
              boxShadow: "rgba(0, 0, 0, 0.24) 0px 3px 8px",
              padding: 20,
              borderRadius: 10,
            }}
          >
            <TextField
              label="Upsell Name"
              value={formData.name}
              disabled={currentUpsell}
              onChange={(value) => setFormData({ ...formData, name: value })}
              autoComplete="off"
            />
            <TextField
              label="Price"
              type="number"
              value={formData.price}
              onChange={(value) => setFormData({ ...formData, price: value })}
              autoComplete="off"
            />
            <TextField
              label="Description"
              value={formData.description}
              onChange={(value) =>
                setFormData({ ...formData, description: value })
              }
              autoComplete="off"
              multiline
            />
            <input type="file" accept="image/*" onChange={handleImageChange} />
            <Button primary onClick={handleSave}>
              {currentUpsell ? "Update Upsell" : "Add Upsell"}
            </Button>
          </div>
        )}

        <Card sectioned>
          <DataTable
            columnContentTypes={["text", "text", "text", "text", "text"]}
            headings={["Image", "Name", "Price", "Description", "Actions"]}
            rows={rows}
          />
        </Card>
      </Card>

      {toast && (
        <Toast
          content={toast.message}
          error={toast.error}
          onDismiss={() => setToast(null)}
        />
      )}
    </Frame>
  );
}
