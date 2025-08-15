import Footer from "@/Pages/Footer/Footer";
import Navbar from "@/Pages/NavBar/NavBar";
import React, { useEffect } from "react";
import { Outlet } from "react-router-dom";

export const MainLayout = () => {
	useEffect(() => {
		window.scrollTo(0, 0);
	}, []);
	return (
		<div>
			<Navbar />
			<Outlet />
			<Footer />
		</div>
	);
};
