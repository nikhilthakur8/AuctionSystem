import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useUserContext } from "@/context/context";

const HeroMinimalBox = () => {
	const navigate = useNavigate();
	const { userData } = useUserContext();
	return (
		<section className="bg-gray-50 min-h-screen flex items-center justify-center overflow-hidden">
			{/* Hero Box */}
			<div className=" z-10 w-full px-6 md:px-12">
				<div className="bg-white relative overflow-hidden shadow-lg rounded-3xl p-12  md:px-20 md:py-32  mx-auto text-center space-y-8">
					<div className="absolute -top-20 -left-20 w-96 h-96 bg-indigo-600 rounded-full opacity-20 filter blur-3xl"></div>
					<div className="absolute -bottom-32 -right-32 w-96 h-96 bg-pink-600 rounded-full opacity-20 filter blur-3xl"></div>
					{/* Heading */}
					<h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
						Live Auctions, Reimagined
					</h1>

					{/* Subheading */}
					<p className="text-gray-600 text-lg md:text-xl max-w-3xl mx-auto">
						Place bids in real-time, track your auctions, and never
						miss a moment. Minimal design, maximum excitement.
					</p>

					{/* CTA Buttons */}
					<div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
						<Button
							size="lg"
							className="bg-indigo-600 text-white hover:bg-white hover:text-indigo-600 border-indigo-600 border font-medium"
							onClick={() => navigate("/auctions")}
						>
							Browse Auctions
						</Button>
						<Button
							size="lg"
							variant="outline"
							className="border-indigo-600 text-indigo-600 hover:bg-indigo-600 hover:text-white font-medium"
							onClick={() =>
								navigate(userData ? "/auctions" : "/register")
							}
						>
							{userData ? "Explore Auctions" : "Get Started"}
						</Button>
					</div>

					{/* Feature Highlights */}
					<div className="flex flex-wrap justify-center gap-6 mt-8 text-gray-500">
						<span className="text-sm font-medium">
							Real-Time Bidding
						</span>
						<span className="text-sm font-medium">
							Instant Notifications
						</span>
						<span className="text-sm font-medium">
							Transparent Auctions
						</span>
						<span className="text-sm font-medium">Easy Setup</span>
					</div>
				</div>
			</div>
		</section>
	);
};

export default HeroMinimalBox;
