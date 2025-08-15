import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUserContext } from "@/context/context";
import { Button } from "@/components/ui/button";

const Navbar = () => {
	const { userData, logout } = useUserContext();
	const navigate = useNavigate();

	return (
		<nav className="bg-white shadow-md fixed w-full top-0 z-50">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex justify-between h-16 items-center">
					{/* Logo */}
					<div className="flex-shrink-0">
						<Link
							to="/"
							className="text-2xl font-medium uppercase tracking-tight text-indigo-600"
						>
							Auctioneer
						</Link>
					</div>

					{/* Links */}
					<div className="hidden md:flex space-x-6 items-center text-gray-700 font-medium">
						<Link to="/">Home</Link>
						<Link to="/auctions">Auctions</Link>
						{userData && (
							<Link to="/create-auction">Create Auction</Link>
						)}
						{userData && <Link to="/my-auctions">My Auctions</Link>}
					</div>

					{/* Auth buttons */}
					<div className="flex items-center space-x-2">
						{userData ? (
							<>
								<span className="text-gray-700">
									Hello, {userData.name}
								</span>
								<Button
									size="sm"
									variant="outline"
									onClick={() => {
										logout();
										navigate("/login");
									}}
								>
									Logout
								</Button>
							</>
						) : (
							<>
								<Button
									size="sm"
									onClick={() => navigate("/login")}
								>
									Login
								</Button>
								<Button
									size="sm"
									variant="outline"
									onClick={() => navigate("/register")}
								>
									Register
								</Button>
							</>
						)}
					</div>
				</div>
			</div>
		</nav>
	);
};

export default Navbar;
