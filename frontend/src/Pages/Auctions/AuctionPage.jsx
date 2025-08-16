import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useUserContext } from "@/context/context";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Zap, Clock, User, DollarSign } from "lucide-react";
import PostAuctionActions from "@/components/PostAuctionActions";

const AuctionPage = () => {
	const { id } = useParams();
	const navigate = useNavigate();
	const [auction, setAuction] = useState(null);
	const [highestBidDetails, setHighestBidDetails] = useState(null);
	const [winnerDetails, setWinnerDetails] = useState(null);
	const { userData } = useUserContext();
	const [loading, setLoading] = useState(true);
	const [timeLeft, setTimeLeft] = useState("");
	const [status, setStatus] = useState("");

	const backendUrl = import.meta.env.VITE_BACKEND_URL || "";

	// Function to fetch auction data
	const fetchAuction = useCallback(async () => {
		try {
			const res = await axios.get(`${backendUrl}/api/auction/${id}`, {
				withCredentials: true,
			});
			if (res.data.success && res.data.auction) {
				setAuction(res.data.auction);
				setHighestBidDetails(res.data.highestBidDetails);
				setWinnerDetails(res.data.winnerDetails);
			}
		} catch (err) {
			toast.error(err.response?.data?.message || err.message);
		} finally {
			setLoading(false);
		}
	}, [backendUrl, id]);

	// Initial fetch of auction data
	useEffect(() => {
		fetchAuction();
	}, [fetchAuction]);

	// Countdown timer + status calculation
	useEffect(() => {
		if (!auction) return;

		const updateTimerAndStatus = () => {
			const now = Date.now();
			const startTime = new Date(auction.goLiveTime).getTime();
			const endTime = startTime + auction.duration * 60000;

			if (now < startTime) {
				// Upcoming
				const diff = startTime - now;
				const days = Math.floor(diff / (1000 * 60 * 60 * 24));
				const hrs = Math.floor(
					(diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
				);
				const mins = Math.floor(
					(diff % (1000 * 60 * 60)) / (1000 * 60)
				);
				setTimeLeft(
					`Starts in ${days > 0 ? `${days}d ` : ""}${hrs}h ${mins}m`
				);
				setStatus("upcoming");
			} else if (now < endTime) {
				// Live
				const diff = endTime - now;
				const hrs = Math.floor(diff / (1000 * 60 * 60));
				const mins = Math.floor(
					(diff % (1000 * 60 * 60)) / (1000 * 60)
				);
				const secs = Math.floor((diff % (1000 * 60)) / 1000);
				setTimeLeft(`${hrs}h ${mins}m ${secs}s remaining`);
				setStatus("active");
			} else {
				// Closed
				setTimeLeft("Auction has ended");
				setStatus("closed");

				// Show notification when auction just ended
				if (status === "active") {
					if (highestBidDetails) {
						if (userData?.id === auction.sellerId) {
							toast.info(
								`Auction ended! Highest bid: ₹${parseFloat(
									highestBidDetails.amount
								).toLocaleString()} by ${
									highestBidDetails.bidder.name
								}. Please decide whether to accept, reject, or make a counter-offer.`
							);
						} else if (
							userData?.id === highestBidDetails.bidder.id
						) {
							toast.success(
								`Auction ended! You have the highest bid of ₹${parseFloat(
									highestBidDetails.amount
								).toLocaleString()}. Awaiting seller's decision.`
							);
						} else {
							toast.info(
								`Auction ended! Final bid: ₹${parseFloat(
									highestBidDetails.amount
								).toLocaleString()}`
							);
						}
					} else {
						toast.info("Auction ended with no bids placed.");
					}
				}
			}
		};

		updateTimerAndStatus();
		const timer = setInterval(updateTimerAndStatus, 1000);
		return () => clearInterval(timer);
	}, [auction, status, highestBidDetails, userData]);

	if (loading) {
		return (
			<div className="min-h-screen flex justify-center items-center bg-gray-100 animate-pulse">
				<div className="w-full max-w-3xl space-y-6">
					<div className="h-12 bg-gray-300 rounded w-3/5"></div>
					<div className="h-6 bg-gray-300 rounded w-2/5"></div>
					<div className="h-64 bg-gray-300 rounded-lg"></div>
					<div className="grid grid-cols-3 gap-4 mt-6">
						<div className="h-24 bg-gray-300 rounded-lg"></div>
						<div className="h-24 bg-gray-300 rounded-lg"></div>
						<div className="h-24 bg-gray-300 rounded-lg"></div>
					</div>
				</div>
			</div>
		);
	}

	if (!auction) {
		return (
			<div className="min-h-screen flex justify-center items-center bg-gray-100">
				<div className="text-center p-8 bg-white rounded-lg shadow-md max-w-md">
					<h2 className="text-2xl font-semibold mb-2">
						Auction Not Found
					</h2>
					<p className="text-gray-600 mb-6">
						The auction you're looking for doesn't exist or may have
						been removed.
					</p>
					<Button
						onClick={() => window.history.back()}
						variant="outline"
					>
						<ArrowLeft className="w-4 h-4 mr-2" /> Back
					</Button>
				</div>
			</div>
		);
	}

	const isLive = status === "active";
	const isUpcoming = status === "upcoming";
	const isClosed = status === "closed";

	const getStatusColor = () => {
		if (isLive) return "bg-green-100 text-green-800 animate-pulse";
		if (isUpcoming) return "bg-blue-100 text-blue-800";
		return "bg-gray-100 text-gray-800";
	};

	return (
		<div className="min-h-screen bg-gray-50  px-4 lg:px-6 py-20">
			<div className="max-w-4xl mx-auto space-y-6">
				{/* Header */}
				<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
					<Button
						onClick={() => window.history.back()}
						variant="ghost"
						size="sm"
						className="mb-4"
					>
						<ArrowLeft className="w-4 h-4 mr-2" /> Back to Auctions
					</Button>

					<div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
						<div className="flex-1">
							<h1 className="text-3xl font-bold text-gray-900 mb-3">
								{auction.itemName}
							</h1>
							<div className="flex flex-wrap items-center gap-3">
								<span
									className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}
								>
									{status.charAt(0).toUpperCase() +
										status.slice(1)}
								</span>
								<div className="flex items-center text-gray-600">
									<Clock className="w-4 h-4 mr-1" />
									<span className="text-sm">{timeLeft}</span>
								</div>
							</div>
						</div>

						{isLive && (
							<Button
								onClick={() => navigate(`/auction/live/${id}`)}
								className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
							>
								<Zap className="w-4 h-4" /> Live Bidding
							</Button>
						)}
					</div>
				</div>

				{/* Description */}
				<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
					<h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center">
						<svg
							className="w-5 h-5 mr-2"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M9 12h6m-6 4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.824-2.562M15 9.75a3 3 0 11-6 0 3 3 0 016 0z"
							/>
						</svg>
						Description
					</h2>
					<p className="text-gray-700 leading-relaxed">
						{auction.description || "No description provided."}
					</p>
				</div>

				{/* Auction Details Grid */}
				<div className="grid grid-cols-1  lg:grid-cols-3 gap-4">
					<div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
						<div className="flex items-center mb-2">
							<DollarSign className="w-5 h-5 text-green-600 mr-2" />
							<p className="text-sm text-gray-500">
								Starting Price
							</p>
						</div>
						<p className="text-2xl font-semibold text-gray-900">
							₹{auction.startingPrice.toLocaleString()}
						</p>
					</div>

					<div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
						<div className="flex items-center mb-2">
							<svg
								className="w-5 h-5 text-blue-600 mr-2"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
								/>
							</svg>
							<p className="text-sm text-gray-500">
								Bid Increment
							</p>
						</div>
						<p className="text-2xl font-semibold text-gray-900">
							₹{auction.bidIncrement.toLocaleString()}
						</p>
					</div>

					{highestBidDetails && (
						<div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
							<div className="flex items-center mb-2">
								<svg
									className="w-5 h-5 text-yellow-600 mr-2"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
									/>
								</svg>
								<p className="text-sm text-gray-500">
									Highest Bid
								</p>
							</div>
							<p className="text-2xl font-semibold text-gray-900">
								₹
								{parseFloat(
									highestBidDetails.amount
								).toLocaleString()}
							</p>
							<p className="text-xs text-gray-500 mt-1">
								by {highestBidDetails.bidder.name}
							</p>
						</div>
					)}
				</div>

				{/* Timeline */}
				<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
					<h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
						<Clock className="w-5 h-5 mr-2" />
						Auction Timeline
					</h2>
					<div className="relative flex items-center justify-between">
						{/* Start */}
						<div className="flex flex-col items-center relative">
							<div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
								S
							</div>
							<p className="mt-2 text-sm font-medium text-gray-700">
								Start
							</p>
							<p className="text-xs text-gray-500 text-center">
								{new Date(
									auction.goLiveTime
								).toLocaleDateString()}
							</p>
							<p className="text-xs text-gray-500 text-center">
								{new Date(
									auction.goLiveTime
								).toLocaleTimeString([], {
									hour: "2-digit",
									minute: "2-digit",
								})}
							</p>
						</div>

						{/* Line */}
						<div className="flex-1 h-1 bg-gray-300 mx-2"></div>

						{/* Live */}
						<div className="flex flex-col items-center relative">
							<div
								className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
									isLive
										? "bg-green-600 animate-pulse"
										: "bg-gray-400"
								}`}
							>
								L
							</div>
							<p className="mt-2 text-sm font-medium text-gray-700">
								Live
							</p>
							<p className="text-xs text-gray-500 text-center">
								{auction.duration}min
							</p>
						</div>

						{/* Line */}
						<div className="flex-1 h-1 bg-gray-300 mx-2"></div>

						{/* End */}
						<div className="flex flex-col items-center relative">
							<div
								className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
									isClosed ? "bg-red-600" : "bg-gray-400"
								}`}
							>
								E
							</div>
							<p className="mt-2 text-sm font-medium text-gray-700">
								End
							</p>
							<p className="text-xs text-gray-500 text-center">
								{new Date(
									new Date(auction.goLiveTime).getTime() +
										auction.duration * 60000
								).toLocaleDateString()}
							</p>
							<p className="text-xs text-gray-500 text-center">
								{new Date(
									new Date(auction.goLiveTime).getTime() +
										auction.duration * 60000
								).toLocaleTimeString([], {
									hour: "2-digit",
									minute: "2-digit",
								})}
							</p>
						</div>
					</div>
				</div>

				{/* Post Auction Actions - Only show when auction is closed */}
				{isClosed && (
					<PostAuctionActions
						auction={auction}
						highestBidDetails={highestBidDetails}
						winnerDetails={winnerDetails}
						userData={userData}
						onRefresh={fetchAuction}
					/>
				)}

				{/* Auction Status Notice */}
				{isUpcoming && (
					<div className="bg-blue-50 p-5 rounded-xl border border-blue-200 text-center">
						<div className="flex items-center justify-center mb-2">
							<Clock className="w-5 h-5 text-blue-600 mr-2" />
							<span className="text-blue-800 font-medium">
								Upcoming Auction
							</span>
						</div>
						<p className="text-blue-600">
							Auction will start on{" "}
							{new Date(auction.goLiveTime).toLocaleString()}
						</p>
					</div>
				)}
			</div>
		</div>
	);
};

export default AuctionPage;
