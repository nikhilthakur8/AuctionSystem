import { Button } from "@/components/ui/button";
import { useUserContext } from "@/context/context";
import Footer from "@/Pages/Footer/Footer";
import Navbar from "@/Pages/NavBar/NavBar";
import { Outlet, useNavigate } from "react-router-dom";

export const ProtectedLayout = () => {
	const { userData } = useUserContext();
	const navigate = useNavigate();
	if (!userData) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<Navbar />
				<div className="text-center">
					<p className="mb-4">
						You must be logged in to view this page.
					</p>
					<Button onClick={() => navigate("/login")}>Log In</Button>
				</div>
			</div>
		);
	}
	return (
		<div>
			<Navbar />
			<Outlet />
			<Footer />
		</div>
	);
};
