import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useUserContext } from "@/context/context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, Zap } from "lucide-react";

const AuctionPage = () => {
	const { id } = useParams();
	const navigate = useNavigate();
	const [auction, setAuction] = useState(null);
	const [highestBidDetails, setHighestBidDetails] = useState(null); // New state for highest bid details
	const [winnerDetails, setWinnerDetails] = useState(null); // New state for winner details
	const { userData } = useUserContext();
	const [loading, setLoading] = useState(true);
	const [timeLeft, setTimeLeft] = useState("");
	const [status, setStatus] = useState(""); // frontend-calculated status
	const [counterAmount, setCounterAmount] = useState(""); // State for seller's counter-offer input
	const [showCounterInput, setShowCounterInput] = useState(false); // State to toggle counter-offer input for seller

	const backendUrl = import.meta.env.VITE_BACKEND_URL || "";

	// Function to fetch auction data, wrapped in useCallback to prevent re-creation
	const fetchAuction = useCallback(async () => {
		try {
			const res = await axios.get(`${backendUrl}/api/auction/${id}`, {
				withCredentials: true,
			});
			if (res.data.success && res.data.auction) {
				setAuction(res.data.auction);
				// Set the new state variables for highest bid and winner details
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
				setTimeLeft("Auction ended");
				setStatus("closed");
			}
		};

		updateTimerAndStatus();
		const timer = setInterval(updateTimerAndStatus, 1000);
		return () => clearInterval(timer);
	}, [auction]);

	// --- Seller Actions ---
	const handleAcceptBid = async () => {
		try {
			const res = await axios.post(
				`${backendUrl}/api/auction/${id}/accept`,
				{},
				{ withCredentials: true }
			);
			if (res.data.success) {
				toast.success(res.data.message);
				fetchAuction(); // Re-fetch data to update UI
			}
		} catch (err) {
			toast.error(err.response?.data?.message || err.message);
		}
	};

	const handleRejectBid = async () => {
		try {
			const res = await axios.post(
				`${backendUrl}/api/auction/${id}/reject`,
				{},
				{ withCredentials: true }
			);
			if (res.data.success) {
				toast.success(res.data.message);
				fetchAuction(); // Re-fetch data to update UI
			}
		} catch (err) {
			toast.error(err.response?.data?.message || err.message);
		}
	};

	const handleSendCounterOffer = async () => {
		if (
			!counterAmount ||
			isNaN(counterAmount) ||
			parseFloat(counterAmount) <= 0
		) {
			toast.error("Please enter a valid counter offer amount.");
			return;
		}
		try {
			const res = await axios.post(
				`${backendUrl}/api/auction/${id}/counter-offer`,
				{ amount: parseFloat(counterAmount) },
				{ withCredentials: true }
			);
			if (res.data.success) {
				toast.success(res.data.message);
				setShowCounterInput(false);
				setCounterAmount("");
				fetchAuction(); // Re-fetch data to update UI
			}
		} catch (err) {
			toast.error(err.response?.data?.message || err.message);
		}
	};

	// --- Buyer Actions ---
	const handleAcceptCounter = async () => {
		try {
			const res = await axios.post(
				`${backendUrl}/api/auction/${id}/counter-response`,
				{ accept: true, amount: auction.counterOfferPrice },
				{ withCredentials: true }
			);
			if (res.data.success) {
				toast.success(res.data.message);
				fetchAuction(); // Re-fetch data to update UI
			}
		} catch (err) {
			toast.error(err.response?.data?.message || err.message);
		}
	};

	const handleRejectCounter = async () => {
		try {
			const res = await axios.post(
				`${backendUrl}/api/auction/${id}/counter-response`,
				{ accept: false },
				{ withCredentials: true }
			);
			if (res.data.success) {
				toast.success(res.data.message);
				fetchAuction(); // Re-fetch data to update UI
			}
		} catch (err) {
			toast.error(err.response?.data?.message || err.message);
		}
	};

	if (loading)
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

	if (!auction)
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

	const isLive = status === "active";
	const isUpcoming = status === "upcoming";
	const isClosed = status === "closed";

	// Determine user roles and relevant auction states
	const isSeller = userData?.id === auction?.sellerId;
	const isHighestBidder = userData?.id === highestBidDetails?.bidder?.id; // Use highestBidDetails
	const hasHighestBid = highestBidDetails !== null;

	return (
		<div className="min-h-screen bg-gray-50 p-6 flex justify-center py-12">
			<div className="w-full max-w-4xl bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden space-y-6 p-8">
				{/* Header */}
				<div className="flex justify-between items-start">
					<div>
						<Button
							onClick={() => window.history.back()}
							variant="ghost"
							size="sm"
							className="mb-4"
						>
							<ArrowLeft className="w-4 h-4 mr-2" /> Back to
							Auctions
						</Button>
						<h1 className="text-3xl font-bold text-gray-900">
							{auction.itemName}
						</h1>
						<div className="flex items-center gap-3 mt-2">
							<span
								className={`px-3 py-1 rounded-full text-xs font-medium ${
									isLive
										? "bg-green-100 text-green-800 animate-pulse"
										: isUpcoming
										? "bg-blue-100 text-blue-800"
										: "bg-gray-100 text-gray-800"
								}`}
							>
								{status.charAt(0).toUpperCase() +
									status.slice(1)}
							</span>
							<p className="text-lg text-gray-600">{timeLeft}</p>
						</div>
					</div>
					<div className="flex items-center space-x-2">
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
				<div className="bg-gray-50 p-6 rounded-lg">
					<h2 className="text-xl font-semibold text-gray-900 mb-3">
						Description
					</h2>
					<p className="text-gray-700">
						{auction.description || "No description provided."}
					</p>
				</div>

				{/* Auction Stats */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
						<p className="text-sm text-gray-500 mb-1">
							Starting Price
						</p>
						<p className="text-2xl font-semibold text-gray-900">
							₹{auction.startingPrice.toLocaleString()}
						</p>
					</div>

					<div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
						<p className="text-sm text-gray-500 mb-1">
							Bid Increment
						</p>
						<p className="text-2xl font-semibold text-gray-900">
							₹{auction.bidIncrement.toLocaleString()}
						</p>
					</div>
				</div>

				{/* Seller Actions Section */}
				{isSeller && isClosed && hasHighestBid && (
					<div className="bg-gray-50 p-6 rounded-lg border border-gray-200 shadow-sm">
						<h2 className="text-xl font-semibold text-gray-900 mb-4">
							Seller Actions
						</h2>
						<p className="text-gray-700 mb-4">
							Highest Bid:{" "}
							<span className="font-bold text-lg">
								₹{highestBidDetails.amount.toLocaleString()}
							</span>{" "}
							by {highestBidDetails.bidder.name}
						</p>

						{/* Seller sees these options if the bid is pending */}
						{auction.statusAfterBid === "pending" && (
							<div className="flex flex-wrap gap-3">
								<Button
									onClick={handleAcceptBid}
									className="bg-green-600 hover:bg-green-700 text-white shadow-md"
								>
									Accept Highest Bid
								</Button>
								<Button
									onClick={handleRejectBid}
									variant="destructive"
									className="shadow-md"
								>
									Reject Highest Bid
								</Button>
								<Button
									onClick={() => setShowCounterInput(true)}
									variant="outline"
									className="shadow-md"
								>
									Counter Offer
								</Button>
							</div>
						)}

						{/* Input for counter offer */}
						{showCounterInput &&
							auction.statusAfterBid === "pending" && (
								<div className="flex flex-col gap-3 mt-5 p-4 border rounded-lg bg-white shadow-inner">
									<label
										htmlFor="counterAmount"
										className="text-base font-medium text-gray-700"
									>
										Enter Your Counter Offer Amount:
									</label>
									<Input
										id="counterAmount"
										type="number"
										value={counterAmount}
										onChange={(e) =>
											setCounterAmount(e.target.value)
										}
										placeholder={`Enter amount (e.g., ${(
											parseFloat(
												highestBidDetails.amount
											) + auction.bidIncrement
										).toLocaleString()})`}
										className="p-3 border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-lg"
									/>
									<div className="flex gap-2">
										<Button
											onClick={handleSendCounterOffer}
											className="bg-blue-600 hover:bg-blue-700 text-white shadow-md"
										>
											Send Counter Offer
										</Button>
										<Button
											onClick={() =>
												setShowCounterInput(false)
											}
											variant="ghost"
										>
											Cancel
										</Button>
									</div>
								</div>
							)}

						{/* Seller sees this message if a counter-offer has been sent */}
						{auction.statusAfterBid === "countered" && (
							<p className="text-blue-600 font-medium mt-4 p-3 bg-blue-50 rounded-lg">
								Counter offer of ₹
								{auction.counterOfferPrice?.toLocaleString()}{" "}
								sent. Awaiting buyer's response.
							</p>
						)}

						{/* Seller sees this message if the bid or counter-offer was accepted/rejected */}
						{auction.statusAfterBid === "accepted" && (
							<p className="text-green-600 font-medium mt-4 p-3 bg-green-50 rounded-lg">
								Auction closed. Bid accepted for ₹
								{auction.counterOfferPrice
									? auction.counterOfferPrice.toLocaleString()
									: highestBidDetails.amount.toLocaleString()}
								.
							</p>
						)}
						{auction.statusAfterBid === "rejected" && (
							<p className="text-red-600 font-medium mt-4 p-3 bg-red-50 rounded-lg">
								Auction closed. Highest bid rejected.
							</p>
						)}
					</div>
				)}

				{/* Buyer Actions Section (only if highest bidder and counter-offer exists and statusAfterBid is 'countered') */}
				{isHighestBidder &&
					isClosed &&
					auction.statusAfterBid === "countered" && (
						<div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200 shadow-sm">
							<h2 className="text-xl font-semibold text-gray-900 mb-4">
								Counter Offer from Seller
							</h2>
							<p className="text-gray-700 mb-5">
								The seller has sent a counter offer for:{" "}
								<span className="font-bold text-xl text-yellow-800">
									₹
									{auction.counterOfferPrice?.toLocaleString()}
								</span>
							</p>
							<div className="flex flex-wrap gap-3">
								<Button
									onClick={handleAcceptCounter}
									className="bg-green-600 hover:bg-green-700 text-white shadow-md"
								>
									Accept Counter Offer
								</Button>
								<Button
									onClick={handleRejectCounter}
									variant="destructive"
									className="shadow-md"
								>
									Reject Counter Offer
								</Button>
							</div>
						</div>
					)}

				{/* Final Auction Status Display for all relevant users */}
				{isClosed &&
					(auction.winnerId ||
						auction.statusAfterBid === "accepted") && (
						<div className="bg-green-50 p-5 rounded-lg border border-green-200 text-center shadow-md">
							<p className="text-green-800 text-lg font-semibold">
								Auction Concluded:{" "}
								{auction.winnerId === userData?.id
									? "You Won!"
									: winnerDetails?.name // Display winner's name if available
									? `Sold to ${winnerDetails.name}!`
									: "Sold to Another Bidder!"}
							</p>
							<p className="text-green-700 mt-2">
								Final Price: ₹
								{auction.counterOfferPrice
									? parseFloat(
											auction.counterOfferPrice
									  ).toLocaleString()
									: highestBidDetails?.amount
									? parseFloat(
											highestBidDetails.amount
									  ).toLocaleString()
									: parseFloat(
											auction.startingPrice
									  ).toLocaleString()}
							</p>
						</div>
					)}
				{isClosed &&
					!auction.winnerId &&
					auction.statusAfterBid === "rejected" && (
						<div className="bg-red-50 p-5 rounded-lg border border-red-200 text-center shadow-md">
							<p className="text-red-800 text-lg font-semibold">
								Auction Closed - No Winner
							</p>
							<p className="text-red-700 mt-2">
								The highest bid was rejected, and no counter
								offer was accepted.
							</p>
						</div>
					)}

				{/* Timeline */}
				<div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
					<h2 className="text-xl font-semibold text-gray-900 mb-6">
						Auction Timeline
					</h2>
					<div className="relative flex items-center justify-between">
						{/* Start */}
						<div className="flex flex-col items-center relative">
							<div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
								S
							</div>
							<p className="mt-2 text-sm font-medium text-gray-700">
								Start
							</p>
							<p className="text-xs text-gray-500">
								{new Date(
									auction.goLiveTime
								).toLocaleDateString()}
							</p>
							<p className="text-xs text-gray-500">
								{new Date(
									auction.goLiveTime
								).toLocaleTimeString()}
							</p>
						</div>

						{/* Line */}
						<div className="flex-1 h-1 bg-gray-300 mx-2 relative top-4"></div>

						{/* Live */}
						<div className="flex flex-col items-center relative">
							<div
								className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
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
							<p className="text-xs text-gray-500">{timeLeft}</p>
						</div>

						{/* Line */}
						<div className="flex-1 h-1 bg-gray-300 mx-2 relative top-4"></div>

						{/* End */}
						<div className="flex flex-col items-center relative">
							<div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white font-bold">
								E
							</div>
							<p className="mt-2 text-sm font-medium text-gray-700">
								End
							</p>
							<p className="text-xs text-gray-500">
								{new Date(
									new Date(auction.goLiveTime).getTime() +
										auction.duration * 60000
								).toLocaleDateString()}
							</p>
							<p className="text-xs text-gray-500">
								{new Date(
									new Date(auction.goLiveTime).getTime() +
										auction.duration * 60000
								).toLocaleTimeString()}
							</p>
						</div>
					</div>
				</div>

				{/* Auction Notices */}
				{isUpcoming && (
					<div className="bg-blue-50 p-5 rounded-lg border border-blue-200 text-center">
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
