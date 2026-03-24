import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import HowlChat from "./pages/HowlChat";
import Admin from "./pages/Admin";
import AdminSettings from "./pages/AdminSettings";
import Reviews from "./pages/Reviews";
import MyPage from "./pages/MyPage"; // 👈 1. 마이페이지 파일을 불러옵니다.
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HowlChat />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
          <Route path="/reviews" element={<Reviews />} />
          <Route path="/mypage" element={<MyPage />} /> {/* 👈 2. 마이페이지 주소를 등록합니다. */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
