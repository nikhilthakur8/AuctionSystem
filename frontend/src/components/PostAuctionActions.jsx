import React, { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import axios from "axios";
import {
	CheckCircle,
	XCircle,
	AlertCircle,
	Activity,
	User,
	Award,
} from "lucide-react";

const PostAuctionActions = ({
	auction,
	highestBidDetails,
	winnerDetails,
	userData,
	onRefresh,
}) => {
	const [counterAmount, setCounterAmount] = useState("");
	const [showCounterInput, setShowCounterInput] = useState(false);
	const [loadingAction, setLoadingAction] = useState(""); // Track which button is loading

	const backendUrl = import.meta.env.VITE_BACKEND_URL || "";

	const isSeller = userData?.id === auction?.sellerId;
	const isHighestBidder = userData?.id === highestBidDetails?.bidder?.id;
	const hasHighestBid = highestBidDetails !== null;

	// ------------------- Actions ------------------- //
	const handleAcceptBid = async () => {
		setLoadingAction("acceptBid");
		try {
			const res = await axios.post(
				`${backendUrl}/api/auction/${auction.id}/accept`,
				{},
				{ withCredentials: true }
			);
			if (res.data.success)
				toast.success(
					"Bid accepted successfully. Winner has been notified."
				);
			onRefresh();
		} catch (err) {
			toast.error(err.response?.data?.message || err.message);
		} finally {
			setLoadingAction("");
		}
	};

	const handleRejectBid = async () => {
		setLoadingAction("rejectBid");
		try {
			const res = await axios.post(
				`${backendUrl}/api/auction/${auction.id}/reject`,
				{},
				{ withCredentials: true }
			);
			if (res.data.success)
				toast.success("Bid rejected. Bidder has been notified.");
			onRefresh();
		} catch (err) {
			toast.error(err.response?.data?.message || err.message);
		} finally {
			setLoadingAction("");
		}
	};

	const handleSendCounterOffer = async () => {
		if (
			!counterAmount ||
			isNaN(counterAmount) ||
			parseFloat(counterAmount) <= 0
		) {
			toast.error("Please enter a valid counter-offer amount.");
			return;
		}
		setLoadingAction("counterOffer");
		try {
			const res = await axios.post(
				`${backendUrl}/api/auction/${auction.id}/counter-offer`,
				{ amount: parseFloat(counterAmount) },
				{ withCredentials: true }
			);
			if (res.data.success)
				toast.success(
					`Counter-offer of ₹${parseFloat(
						counterAmount
					).toLocaleString()} sent!`
				);
			setShowCounterInput(false);
			setCounterAmount("");
			onRefresh();
		} catch (err) {
			toast.error(err.response?.data?.message || err.message);
		} finally {
			setLoadingAction("");
		}
	};

	const handleAcceptCounter = async () => {
		setLoadingAction("acceptCounter");
		try {
			const res = await axios.post(
				`${backendUrl}/api/auction/${auction.id}/counter-response`,
				{ accept: true, amount: auction.counterOfferPrice },
				{ withCredentials: true }
			);
			if (res.data.success)
				toast.success(
					"Counter-offer accepted. Payment confirmation sent."
				);
			onRefresh();
		} catch (err) {
			toast.error(err.response?.data?.message || err.message);
		} finally {
			setLoadingAction("");
		}
	};

	const handleRejectCounter = async () => {
		setLoadingAction("rejectCounter");
		try {
			const res = await axios.post(
				`${backendUrl}/api/auction/${auction.id}/counter-response`,
				{ accept: false },
				{ withCredentials: true }
			);
			if (res.data.success)
				toast.success("Counter-offer rejected. Seller notified.");
			onRefresh();
		} catch (err) {
			toast.error(err.response?.data?.message || err.message);
		} finally {
			setLoadingAction("");
		}
	};

	// ------------------- UI Helpers ------------------- //
	const renderButton = (onClick, variant, icon, text, loadingKey) => (
		<Button
			onClick={onClick}
			variant={variant}
			disabled={loadingAction === loadingKey}
			className="flex items-center gap-2 shadow-md"
		>
			{loadingAction === loadingKey ? (
				<Activity className="w-4 h-4 animate-spin" />
			) : (
				icon
			)}{" "}
			{text}
		</Button>
	);

	// ------------------- Sections ------------------- //
	const renderSellerDecisionSection = () => {
		if (!isSeller || !hasHighestBid) return null;

		return (
			<div className="bg-blue-50 p-6 rounded-lg border border-blue-200 shadow-sm">
				<div className="flex items-center mb-4 gap-3">
					<User className="w-6 h-6 text-blue-600" />
					<h2 className="text-xl font-semibold text-gray-900">
						Seller Actions
					</h2>
				</div>

				<div className="bg-white p-4 rounded-lg mb-4 border border-blue-200">
					<p className="text-gray-700 mb-2 font-medium">
						Highest Bid:
					</p>
					<p className="text-2xl font-bold text-blue-800 mb-2">
						₹{highestBidDetails.amount.toLocaleString()}
					</p>
					<p className="text-gray-600 text-sm">
						Bidder: {highestBidDetails.bidder.name} •{" "}
						{highestBidDetails.bidder.email}
					</p>
				</div>

				{/* Pending bid actions */}
				{auction.statusAfterBid === "pending" && (
					<div>
						<p className="text-gray-700 mb-4 text-sm bg-yellow-50 p-3 rounded-lg border border-yellow-200 font-medium">
							<strong>Your options:</strong> Accept the bid to
							complete the sale, reject it to end the auction, or
							make a counter-offer. All participants will see the
							status update.
						</p>
						<div className="flex flex-wrap gap-3">
							{renderButton(
								handleAcceptBid,
								"",
								<CheckCircle className="w-4 h-4" />,
								"Accept Bid",
								"acceptBid"
							)}
							{renderButton(
								handleRejectBid,
								"destructive",
								<XCircle className="w-4 h-4" />,
								"Reject Bid",
								"rejectBid"
							)}
							{renderButton(
								() => setShowCounterInput(true),
								"outline",
								<Activity className="w-4 h-4" />,
								"Counter Offer",
								"counterOffer"
							)}
						</div>
					</div>
				)}

				{/* Counter offer input */}
				{showCounterInput && auction.statusAfterBid === "pending" && (
					<div className="flex flex-col gap-3 mt-5 p-4 border rounded-lg bg-white shadow-inner">
						<label
							htmlFor="counterAmount"
							className="text-base font-medium text-gray-700"
						>
							Enter Counter-Offer Amount:
						</label>
						<Input
							id="counterAmount"
							type="number"
							value={counterAmount}
							onChange={(e) => setCounterAmount(e.target.value)}
							placeholder={`e.g., ${(
								parseFloat(highestBidDetails.amount) +
								auction.bidIncrement
							).toLocaleString()}`}
							className="p-3 border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-lg"
						/>
						<div className="flex gap-2">
							{renderButton(
								handleSendCounterOffer,
								"",
								<Activity className="w-4 h-4" />,
								"Send Counter-Offer",
								"counterOffer"
							)}
							<Button
								onClick={() => setShowCounterInput(false)}
								variant="ghost"
							>
								Cancel
							</Button>
						</div>
					</div>
				)}

				{/* Counter offer sent */}
				{auction.statusAfterBid === "countered" && (
					<div className="text-blue-600 font-medium mt-4 p-3 bg-blue-50 rounded-lg flex items-center gap-2">
						<AlertCircle className="w-4 h-4" />
						<div>
							<p>
								Counter-offer of ₹
								{auction.counterOfferPrice?.toLocaleString()}{" "}
								sent to {highestBidDetails?.bidder?.name}.
							</p>
							<p className="text-sm mt-1">
								Waiting for their response. Other viewers see
								"Counter-offer in progress".
							</p>
						</div>
					</div>
				)}

				{/* Bid accepted message inside the same box */}
				{auction.statusAfterBid === "accepted" && (
					<p className="text-green-600 font-medium mt-4 text-sm bg-green-50 p-3 rounded-lg border border-green-200">
						Bid accepted! Sale completed successfully. All viewers
						see "Auction Completed".
					</p>
				)}
			</div>
		);
	};

	const renderBuyerCounterSection = () => {
		if (!isHighestBidder || auction.statusAfterBid !== "countered")
			return null;

		return (
			<div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200 shadow-sm">
				<h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
					<Activity className="w-5 h-5 text-yellow-600" />{" "}
					Counter-Offer from Seller
				</h2>
				<div className="bg-white p-4 rounded-lg mb-4 border border-yellow-200">
					<p className="text-gray-700 mb-2">
						The seller has made a counter-offer for:{" "}
						<span className="font-bold text-xl text-yellow-800">
							₹{auction.counterOfferPrice?.toLocaleString()}
						</span>
					</p>
					<p className="text-sm text-gray-600">
						Your original bid: ₹
						{highestBidDetails?.amount?.toLocaleString()}
					</p>
				</div>
				<p className="text-gray-700 mb-5 text-sm bg-yellow-100 p-3 rounded-lg">
					<strong>Your options:</strong> Accept the counter-offer to
					complete the purchase at this price, or reject it to end the
					auction.
				</p>
				<div className="flex flex-wrap gap-3">
					{renderButton(
						handleAcceptCounter,
						"",
						<CheckCircle className="w-4 h-4" />,
						"Accept Counter-Offer",
						"acceptCounter"
					)}
					{renderButton(
						handleRejectCounter,
						"destructive",
						<XCircle className="w-4 h-4" />,
						"Reject Counter-Offer",
						"rejectCounter"
					)}
				</div>
			</div>
		);
	};

	const renderSuccessSection = () => {
		if (!auction.winnerId && auction.statusAfterBid !== "accepted")
			return null;

		const isWinner = auction.winnerId === userData?.id;
		const isSeller = auction.sellerId === userData?.id;

		let userSpecificMessage = "";
		let userTitle = "";

		if (isWinner) {
			userTitle = "Congratulations! You Won!";
			userSpecificMessage =
				"You won this auction! Payment instructions have been sent to your email. Please complete payment to finalize the purchase.";
		} else if (isSeller) {
			userTitle = "Item Sold Successfully!";
			userSpecificMessage = `Your item has been sold to ${
				winnerDetails?.name || "the winning bidder"
			}. You will receive payment confirmation once the buyer completes payment.`;
		} else {
			userTitle = "Auction Completed";
			userSpecificMessage = `This auction has been won by ${
				winnerDetails?.name || "another bidder"
			}. Thank you for your participation!`;
		}

		return (
			<div className="bg-green-50 p-5 rounded-lg border border-green-200 shadow-md">
				<div className="flex justify-center mb-3">
					<CheckCircle className="w-12 h-12 text-green-600" />
				</div>
				<p className="text-green-800 text-lg font-semibold text-center">
					{userTitle}
				</p>
				<p className="text-green-700 mt-2 text-base text-center">
					{userSpecificMessage}
				</p>
				<p className="text-green-600 mt-3 text-lg font-bold text-center">
					Final Price: ₹
					{auction.counterOfferPrice
						? parseFloat(auction.counterOfferPrice).toLocaleString()
						: highestBidDetails?.amount
						? parseFloat(highestBidDetails.amount).toLocaleString()
						: parseFloat(auction.startingPrice).toLocaleString()}
				</p>
				{isWinner && (
					<div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
						<p className="text-blue-800 text-sm font-medium">
							Next Steps:
						</p>
						<ul className="text-blue-700 text-sm mt-1 list-disc list-inside">
							<li>Check your email for payment instructions</li>
							<li>
								Complete payment within the specified timeframe
							</li>
							<li>
								You'll receive confirmation once payment is
								processed
							</li>
						</ul>
					</div>
				)}
				{isSeller && (
					<div className="mt-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
						<p className="text-orange-800 text-sm font-medium">
							What's Next:
						</p>
						<ul className="text-orange-700 text-sm mt-1 list-disc list-inside">
							<li>
								The winner has been notified and sent payment
								instructions
							</li>
							<li>
								You'll receive confirmation once they complete
								payment
							</li>
							<li>
								Prepare your item for delivery/pickup as agreed
							</li>
						</ul>
					</div>
				)}
			</div>
		);
	};

	const renderRejectedSection = () => {
		if (auction.winnerId || auction.statusAfterBid !== "rejected")
			return null;

		const isSeller = auction.sellerId === userData?.id;
		const wasHighestBidder = userData?.id === highestBidDetails?.bidder?.id;

		let userSpecificMessage = "";
		let userTitle = "";

		if (isSeller) {
			userTitle = "You Rejected the Highest Bid";
			userSpecificMessage =
				"You have rejected the highest bid on your auction. The auction is now closed. You can consider relisting your item with different terms if desired.";
		} else if (wasHighestBidder) {
			userTitle = "Your Bid Was Not Accepted";
			userSpecificMessage =
				"The seller has decided not to accept your bid. The auction has ended without a sale. Thank you for participating!";
		} else {
			userTitle = "Auction Closed - No Sale";
			userSpecificMessage =
				"The seller rejected the highest bid and the auction has ended without a sale. Thank you for your interest!";
		}

		return (
			<div className="bg-red-50 p-5 rounded-lg border border-red-200 shadow-md">
				<div className="flex justify-center mb-3">
					<XCircle className="w-12 h-12 text-red-600" />
				</div>
				<p className="text-red-800 text-lg font-semibold text-center">
					{userTitle}
				</p>
				<p className="text-red-700 mt-2 text-center">
					{userSpecificMessage}
				</p>
				{highestBidDetails && (
					<div className="mt-3 p-3 bg-red-100 rounded-lg">
						<p className="text-red-800 text-sm font-medium text-center">
							Highest bid was ₹
							{parseFloat(
								highestBidDetails.amount
							).toLocaleString()}
							{!isSeller &&
								!wasHighestBidder &&
								` by ${highestBidDetails.bidder.name}`}
						</p>
					</div>
				)}
				{isSeller && (
					<div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
						<p className="text-blue-800 text-sm font-medium">
							Consider:
						</p>
						<ul className="text-blue-700 text-sm mt-1 list-disc list-inside">
							<li>Relisting with a lower starting price</li>
							<li>Adjusting the auction duration</li>
							<li>Improving item description or photos</li>
						</ul>
					</div>
				)}
			</div>
		);
	};

	const renderNoBidsSection = () => {
		if (highestBidDetails || auction.winnerId) return null;

		const isSeller = auction.sellerId === userData?.id;

		let userSpecificMessage = "";
		let userTitle = "";

		if (isSeller) {
			userTitle = "No Bids Received";
			userSpecificMessage =
				"Your auction ended without receiving any bids. Consider adjusting your listing and trying again.";
		} else {
			userTitle = "Auction Ended - No Bids";
			userSpecificMessage =
				"This auction ended without receiving any bids. The item was not sold.";
		}

		return (
			<div className="bg-gray-50 p-5 rounded-lg border border-gray-200 shadow-md">
				<div className="flex justify-center mb-3">
					<Award className="w-12 h-12 text-gray-500" />
				</div>
				<p className="text-gray-800 text-lg font-semibold text-center">
					{userTitle}
				</p>
				<p className="text-gray-700 mt-2 text-center">
					{userSpecificMessage}
				</p>
				{isSeller && (
					<div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
						<p className="text-blue-800 text-sm font-medium">
							Tips for relisting:
						</p>
						<ul className="text-blue-700 text-sm mt-1 list-disc list-inside">
							<li>
								Lower the starting price to attract more bidders
							</li>
							<li>Improve item photos and description</li>
							<li>Choose peak hours for better visibility</li>
							<li>
								Consider shorter auction duration for urgency
							</li>
						</ul>
					</div>
				)}
			</div>
		);
	};

	// Helper function for viewers who are not seller or highest bidder
	const renderViewerStatusSection = () => {
		// Show status for viewers who are not seller or highest bidder
		if (isSeller || isHighestBidder || !hasHighestBid) return null;

		let statusMessage = "";
		let bgColor = "bg-blue-50";
		let borderColor = "border-blue-200";
		let iconColor = "text-blue-600";
		let titleColor = "text-blue-900";
		let textColor = "text-blue-700";

		if (auction.statusAfterBid === "pending") {
			statusMessage = `Auction waiting for seller decision on highest bid of ₹${highestBidDetails.amount.toLocaleString()} by ${
				highestBidDetails.bidder.name
			}`;
		} else if (auction.statusAfterBid === "countered") {
			statusMessage = `Seller sent a counter-offer to the highest bidder. Negotiation in progress.`;
			bgColor = "bg-yellow-50";
			borderColor = "border-yellow-200";
			iconColor = "text-yellow-600";
			titleColor = "text-yellow-900";
			textColor = "text-yellow-700";
		}

		if (!statusMessage) return null;

		return (
			<div
				className={`${bgColor} p-5 rounded-lg border ${borderColor} shadow-sm`}
			>
				<div className="flex items-center mb-3">
					<AlertCircle className={`w-5 h-5 ${iconColor} mr-2`} />
					<h2 className={`text-lg font-semibold ${titleColor}`}>
						Auction Status
					</h2>
				</div>
				<p className={textColor}>{statusMessage}</p>
				<div className="mt-3 p-3 bg-white rounded-lg border">
					<p className="text-sm font-medium text-gray-700">
						Current Highest Bid:
					</p>
					<p className="text-lg font-bold text-gray-900">
						₹{highestBidDetails.amount.toLocaleString()}
					</p>
					<p className="text-sm text-gray-600">
						Bidder: {highestBidDetails.bidder.name}
					</p>
				</div>
			</div>
		);
	};

	return (
		<div className="space-y-6">
			{renderSellerDecisionSection()}
			{renderBuyerCounterSection()}
			{renderViewerStatusSection()}
			{renderSuccessSection()}
			{renderRejectedSection()}
			{renderNoBidsSection()}
		</div>
	);
};

export default PostAuctionActions;
