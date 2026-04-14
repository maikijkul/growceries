import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { BodyViewClassSync } from "./components/BodyViewClassSync";
import { AddInventoryPage } from "./pages/AddInventoryPage";
import { CategoryDetailPage } from "./pages/CategoryDetailPage";
import { ConsumeUnitsPage } from "./pages/ConsumeUnitsPage";
import { HomePage } from "./pages/HomePage";
import { FruitSlotsEditorPage } from "./pages/FruitSlotsEditorPage";
import { GardenCustomIconPage } from "./pages/GardenCustomIconPage";

export default function App() {
  return (
    <BrowserRouter>
      <BodyViewClassSync />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/add" element={<AddInventoryPage />} />
        <Route path="/garden/custom/:kind" element={<GardenCustomIconPage />} />
        <Route path="/garden/tree-slots" element={<FruitSlotsEditorPage />} />
        <Route path="/categories/:categoryId" element={<CategoryDetailPage />} />
        <Route path="/categories/:categoryId/consume" element={<ConsumeUnitsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
