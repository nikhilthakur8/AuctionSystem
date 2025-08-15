import { createRoot } from "react-dom/client";
import "./index.css";
import {
	createBrowserRouter,
	createRoutesFromElements,
	RouterProvider,
	Route,
} from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import Login from "./Pages/Login";
import { AuthLayout } from "./Layout/AuthLayout";
import { UserContextProvider } from "./context/UserContextProvider";
import Register from "./Pages/Register";
import { MainLayout } from "./Layout/MainLayout";
import { Home } from "./Pages/Home/Home";
import Auctions from "./Pages/Auctions/Auctions";
import CreateAuction from "./Pages/Auctions/CreateAuction";
import MyAuctions from "./Pages/Auctions/MyAuctions";
import AuctionPage from "./Pages/Auctions/AuctionPage";
import LiveAuction from "./Pages/Auctions/LiveAuction";

const router = createBrowserRouter(
	createRoutesFromElements(
		<Route>
			{/* Auth layout */}
			<Route element={<AuthLayout />}>
				<Route path="/login" element={<Login />} />
				<Route path="/register" element={<Register />} />
			</Route>

			{/* Main Layout */}
			<Route element={<MainLayout />}>
				<Route path="/" element={<Home />} />
				<Route path="/create-auction" element={<CreateAuction />} />
				<Route path="/auctions" element={<Auctions />} />
				<Route path="/my-auctions" element={<MyAuctions />} />
				<Route path="/auction/:id" element={<AuctionPage />} />
				<Route path="/auction/edit/:id" element={<AuctionPage />} />
				<Route path="/auction/live/:id" element={<LiveAuction />} />
			</Route>
		</Route>
	)
);

createRoot(document.getElementById("root")).render(
	<UserContextProvider>
		<RouterProvider router={router} />
		<Toaster richColors position="bottom-right" />
	</UserContextProvider>
);
