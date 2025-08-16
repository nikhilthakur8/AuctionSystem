import { useUserContext } from "@/context/context";
import Footer from "@/Pages/Footer/Footer";
import Navbar from "@/Pages/NavBar/NavBar";
import axios from "axios";
import React, { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { toast } from "sonner";

export const MainLayout = () => {
	const { login } = useUserContext();
	useEffect(() => {
		window.scrollTo(0, 0);
		const backendUrl = import.meta.env.VITE_BACKEND_URL || "";
		async function fetchProfile() {
			try {
				const res = await axios.get(`${backendUrl}/api/user/profile`, {
					withCredentials: true,
				});
				if (res.data.success && res.data.user) {
					login(res.data.user);
				}
			} catch (err) {}
		}
		fetchProfile();
	}, []);
	return (
		<div>
			<Navbar />
			<Outlet />
			<Footer />
		</div>
	);
};
