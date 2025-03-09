import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { authenticate } from "../shopify.server";
import Upsells from "./upSells";

import {
  Page,
  Layout,
  Card,
  TextContainer,
  Text,
  DataTable,
  Button,
} from "@shopify/polaris";
import { useEffect, useState } from "react";
import {
  BarChart,
  LineChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import "../main.css";
// Custom Styles
const containerStyle = {
  display: "flex",
  minHeight: "100vh",
};

const sidebarStyle = {
  width: "250px",
  backgroundColor: "#fafafa",
  paddingTop: "20px",
  position: "fixed",
  height: "100vh",
  boxShadow: "2px 0 5px rgba(0, 0, 0, 0.1)",
};

const sidebarLinkStyle = {
  display: "block",
  padding: "12px 20px",
  textDecoration: "none",
  color: "#333",
  fontSize: "16px",
  borderBottom: "1px solid #e0e0e0",
};

const contentStyle = {
  marginLeft: "250px",
  padding: "20px",
  flex: 1,
};

const statCardStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  width: "24%",
  padding: "20px",
  borderRadius: "8px",
  backgroundColor: "#f7f7f7",
  boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
};

const graphCardStyle = {
  marginTop: "20px",
  padding: "20px",
  borderRadius: "8px",
  backgroundColor: "#f7f7f7",
  boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
};
const dashboardStyle = {
  display: "flex",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: "20px",
};
export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  return { apiKey: process.env.SHOPIFY_API_KEY || "", shop: session.shop };
};

export default function App() {
  const { apiKey, shop } = useLoaderData();
  const [activetab, setActiveTab] = useState(0);
  const [analytics, setAnalytics] = useState([
    { month: "2024-01", totalSales: 1200, totalOrders: 15 },
    { month: "2024-02", totalSales: 1800, totalOrders: 22 },
    { month: "2024-03", totalSales: 2500, totalOrders: 30 },
    { month: "2024-04", totalSales: 3100, totalOrders: 35 },
    { month: "2024-05", totalSales: 4100, totalOrders: 42 },
  ]);
  const [claims, setClaims] = useState([
    { orderId: "#1001", reason: "Lost", status: "New", amount: "$50.00" },
    {
      orderId: "#1002",
      reason: "Broken",
      status: "In Review",
      amount: "$0.00",
    },
    { orderId: "#1003", reason: "Lost", status: "Resolved", amount: "$25.00" },
    {
      orderId: "#1004",
      reason: "Broken",
      status: "Resolved",
      amount: "$35.00",
    },
  ]);
  const [totalOrders, setTotalOrders] = useState(5000);
  const [protectedOrders, setProtectedOrders] = useState(4500);
  const [openClaims, setOpenClaims] = useState(476);
  const [newClaims, setNewClaims] = useState(5);

  // Fetch and post install API on component mount
  useEffect(() => {
    fetch(`/api/install`, {
      method: "POST",
      body:{shop: shop},
      headers: { "Content-Type": "application/json" },
    })
      .then((res) => res.json())
      .then((data) => console.log(data));
  }, []);

  useEffect(() => {
    fetch(`/api/fetchCutomOrders`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    })
      .then((res) => res.json())
      .then((data) => console.log(data));
  }, []);

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <div style={containerStyle}>
        {/* Custom Sidebar */}
        <div style={sidebarStyle}>
          <nav>
            <ul style={{ listStyleType: "none", paddingLeft: "0" }}>
              <li
                onClick={() => setActiveTab(0)}
                className={activetab == 0 ? "active" : ""}
              >
                <Link to="#" style={sidebarLinkStyle}>
                  Dashboard
                </Link>
              </li>
              <li
                onClick={() => setActiveTab(1)}
                className={activetab == 1 ? "active" : ""}
              >
                <Link to="#" style={sidebarLinkStyle}>
                  Orders
                </Link>
              </li>
              <li
                onClick={() => setActiveTab(2)}
                className={activetab == 2 ? "active" : ""}
              >
                <Link to="#" style={sidebarLinkStyle}>
                  UpSells
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        {/* Content Area */}
        <div style={contentStyle}>
          <Page title="Shipping Protection Dashboard">
            <Layout>
              {activetab == 0 ? (
                <>
                  <Layout.Section>
                    <div style={dashboardStyle}>
                      <Card sectioned style={statCardStyle}>
                        <Text variant="headingMd">New Claims</Text>
                        <Text variant="bodyMd">{newClaims}</Text>
                      </Card>
                      <Card sectioned style={statCardStyle}>
                        <Text variant="headingMd">Open Claims</Text>
                        <Text variant="bodyMd">{openClaims}</Text>
                      </Card>
                      <Card sectioned style={statCardStyle}>
                        <Text variant="headingMd">Total Claims</Text>
                        <Text variant="bodyMd">{totalOrders}</Text>
                      </Card>
                      <Card sectioned style={statCardStyle}>
                        <Text variant="headingMd">Protected Orders</Text>
                        <Text variant="bodyMd">{protectedOrders}</Text>
                      </Card>
                    </div>
                  </Layout.Section>
                  <Layout.Section>
                    <Card
                      title="Additional Revenue"
                      sectioned
                      style={graphCardStyle}
                    >
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={analytics}>
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip />
                          <Line
                            type="monotone"
                            dataKey="totalSales"
                            stroke="#008060"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </Card>
                  </Layout.Section>
                </>
              ) : activetab == 1 ? (
                <Layout.Section>
                  <Card
                    title="Protected Orders vs Non-Protected"
                    sectioned
                    style={graphCardStyle}
                  >
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={analytics}>
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="totalOrders" fill="#FFBB28" />
                        <Bar dataKey="totalSales" fill="#008060" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                  <Layout.Section className="claims-table">
                    <h2>Orders</h2>
                    <table>
                      <thead>
                        <tr>
                          <th>Order No.</th>
                          <th>Claim Filed</th>
                          <th>Reason</th>
                          <th>Tracking No.</th>
                          <th>Issue Status</th>
                          <th>Amount Paid</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>#-00012</td>
                          <td>26/09/2021</td>
                          <td>Lost</td>
                          <td>AJKSHJU897</td>
                          <td className="status new">New</td>
                          <td>$0.00</td>
                        </tr>
                        <tr>
                          <td>#-00012</td>
                          <td>26/09/2021</td>
                          <td>Broken</td>
                          <td>AJKSHJU897</td>
                          <td className="status in-review">In Review</td>
                          <td>$0.00</td>
                        </tr>
                        <tr>
                          <td>#-00012</td>
                          <td>26/09/2021</td>
                          <td>Broken</td>
                          <td>AJKSHJU897</td>
                          <td className="status resolved">Resolved</td>
                          <td>$28.99</td>
                        </tr>
                      </tbody>
                    </table>
                  </Layout.Section>
                </Layout.Section>
              ) : (
                <Layout.Section>
                  <Upsells/>
                </Layout.Section>
              )}
            </Layout>
          </Page>
        </div>
      </div>

      <Outlet />
    </AppProvider>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
