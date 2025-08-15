import React from "react";
import { useNavigate } from "react-router-dom";
import { Github, Twitter, Linkedin } from "lucide-react";

const FooterClean = () => {
	const navigate = useNavigate();

	return (
		<footer className="bg-gray-900 text-gray-100 py-12">
			<div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-4 gap-10">
				{/* Brand */}
				<div className="space-y-4">
					<h2
						className="text-2xl font-bold cursor-pointer"
						onClick={() => navigate("/")}
					>
						Auctioneer
					</h2>
					<p className="text-gray-400 max-w-xs">
						Experience real-time auctions, bid live, and win
						exciting items with full transparency.
					</p>
					<div className="flex gap-4 mt-2">
						<a
							href="https://github.com"
							target="_blank"
							rel="noreferrer"
						>
							<Github className="w-5 h-5 hover:text-white" />
						</a>
						<a
							href="https://twitter.com"
							target="_blank"
							rel="noreferrer"
						>
							<Twitter className="w-5 h-5 hover:text-white" />
						</a>
						<a
							href="https://linkedin.com"
							target="_blank"
							rel="noreferrer"
						>
							<Linkedin className="w-5 h-5 hover:text-white" />
						</a>
					</div>
				</div>

				{/* Navigation */}
				<div className="space-y-2">
					<h3 className="text-lg font-semibold">Navigate</h3>
					<ul className="space-y-1 text-gray-400">
						<li
							className="hover:text-white cursor-pointer"
							onClick={() => navigate("/")}
						>
							Home
						</li>
						<li
							className="hover:text-white cursor-pointer"
							onClick={() => navigate("/auctions")}
						>
							Auctions
						</li>
						<li
							className="hover:text-white cursor-pointer"
							onClick={() => navigate("/about")}
						>
							About
						</li>
						<li
							className="hover:text-white cursor-pointer"
							onClick={() => navigate("/contact")}
						>
							Contact
						</li>
					</ul>
				</div>

				{/* Quick Links */}
				<div className="space-y-2">
					<h3 className="text-lg font-semibold">Quick Links</h3>
					<ul className="space-y-1 text-gray-400">
						<li
							className="hover:text-white cursor-pointer"
							onClick={() => navigate("/how-it-works")}
						>
							How It Works
						</li>
						<li
							className="hover:text-white cursor-pointer"
							onClick={() => navigate("/faq")}
						>
							FAQ
						</li>
						<li
							className="hover:text-white cursor-pointer"
							onClick={() => navigate("/terms")}
						>
							Terms & Conditions
						</li>
						<li
							className="hover:text-white cursor-pointer"
							onClick={() => navigate("/support")}
						>
							Support
						</li>
					</ul>
				</div>

				{/* Contact */}
				<div className="space-y-2">
					<h3 className="text-lg font-semibold">Contact</h3>
					<p className="text-gray-400">
						Email: support@Auctioneer.com
					</p>
					<p className="text-gray-400">Phone: +91 123-456-7890</p>
					<p className="text-gray-400">
						Address: 123 Auction St, City, Country
					</p>
				</div>
			</div>

			{/* Bottom */}
			<div className="mt-10 border-t border-gray-800 pt-6 text-center text-gray-500 text-sm">
				&copy; {new Date().getFullYear()} Auctioneer. All rights
				reserved.
			</div>
		</footer>
	);
};

export default FooterClean;
