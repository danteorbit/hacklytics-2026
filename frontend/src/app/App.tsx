import { RouterProvider } from "react-router";
import { router } from "./routes";
import { ScanProvider } from "./components/scan-context";

export default function App() {
  return (
    <ScanProvider>
      <RouterProvider router={router} />
    </ScanProvider>
  );
}