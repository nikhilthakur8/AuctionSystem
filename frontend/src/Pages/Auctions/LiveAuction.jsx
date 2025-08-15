import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { io } from "socket.io-client";
import { Zap, Bell, Clock, Gavel, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const LiveAuction = () => {
	const { id } = useParams();
	const navigate = useNavigate();
	const [auction, setAuction] = useState(null);
	const [currentBid, setCurrentBid] = useState(0);
	const [newBid, setNewBid] = useState(0);
	const [timeLeft, setTimeLeft] = useState("");
	const [socket, setSocket] = useState(null);
	const [notifications, setNotifications] = useState([]);
	const [loading, setLoading] = useState(true);

	const backendUrl = import.meta.env.VITE_BACKEND_URL || "";
	useEffect(() => {
		async function fetchAuction() {
			try {
				const res = await axios.get(`${backendUrl}/api/auction/${id}`, {
					withCredentials: true,
				});
				if (res.data.success && res.data.auction) {
					setAuction(res.data.auction);
					const baseBid =
						parseFloat(res.data.auction.currentBid) ||
						parseFloat(res.data.auction.startingPrice);
					setCurrentBid(baseBid);
					setNewBid(
						baseBid + parseFloat(res.data.auction.bidIncrement)
					);
				}
			} catch (err) {
				toast.error(err.message);
			} finally {
				setLoading(false);
			}
		}
		fetchAuction();
	}, [backendUrl, id]);

	// Timer with redirect when ended
	useEffect(() => {
		if (!auction) return;

		const updateTimer = () => {
			const now = Date.now();
			const startTime = new Date(auction.goLiveTime).getTime();
			const endTime = startTime + auction.duration * 60000;

			if (now < startTime) {
				const diff = startTime - now;
				const hrs = Math.floor(
					(diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
				);
				const mins = Math.floor(
					(diff % (1000 * 60 * 60)) / (1000 * 60)
				);
				const secs = Math.floor((diff % (1000 * 60)) / 1000);
				setTimeLeft(`Starts in ${hrs}h ${mins}m ${secs}s`);
			} else if (now < endTime) {
				const diff = endTime - now;
				const hrs = Math.floor(diff / (1000 * 60 * 60));
				const mins = Math.floor(
					(diff % (1000 * 60 * 60)) / (1000 * 60)
				);
				const secs = Math.floor((diff % (1000 * 60)) / 1000);
				setTimeLeft(`${hrs}h ${mins}m ${secs}s remaining`);
			} else {
				// Auction ended — redirect and show toast
				toast.error("Bidding has ended");
				navigate("/", { replace: true });
			}
		};

		updateTimer();
		const timer = setInterval(updateTimer, 1000);
		return () => clearInterval(timer);
	}, [auction, navigate]);

	// WebSocket for live bids
	useEffect(() => {
		if (!auction || !id) return;
		const newSocket = io(backendUrl);
		setSocket(newSocket);
		newSocket.emit("joinAuctionRoom", id);

		newSocket.on("bidUpdated", (data) => {
			const bidValue = parseFloat(data.bid) || 0;
			setCurrentBid(bidValue);
			setNewBid(bidValue + parseFloat(auction.bidIncrement));

			const notification = {
				id: Date.now(),
				message: data.message,
				timestamp: new Date().toLocaleTimeString(),
			};
			setNotifications((prev) => [notification, ...prev].slice(0, 20));
			toast.success(data.message);
		});

		newSocket.on("auction-ended", (highestBid) => {
			const bidValue = parseFloat(highestBid) || 0;
			setCurrentBid(bidValue);
			toast(`Auction ended. Highest bid: ₹${bidValue.toLocaleString()}`);
		});

		return () => {
			newSocket.disconnect();
		};
	}, [auction, id, backendUrl]);

	const placeBid = async () => {
		if (newBid <= currentBid) {
			toast.error(
				`Bid must be higher than ₹${currentBid.toLocaleString()}`
			);
			return;
		}
		try {
			const res = await axios.post(
				`${backendUrl}/api/auction/place-bid`,
				{
					auctionId: auction.id,
					amount: newBid,
					socketId: socket?.id,
				},
				{ withCredentials: true }
			);
			if (res.data.success) {
				toast.success(
					`Bid placed successfully: ₹${newBid.toLocaleString()}`
				);
			} else {
				toast.error(res.data.message || "Failed to place bid");
			}
		} catch (err) {
			toast.error(err.response?.data?.message || err.message);
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<Skeleton className="h-12 w-64" />
			</div>
		);
	}

	if (!auction) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<h2 className="text-2xl font-semibold">
						Auction Not Found
					</h2>
					<Button
						onClick={() => navigate(-1)}
						variant="outline"
						className="mt-4"
					>
						Go Back
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen py-20 px-10 bg-gray-50 grid grid-cols-1 md:grid-cols-4">
			{/* Auction Info */}
			<div className="flex-1 p-8 overflow-y-auto col-span-3">
				<div className="max-w-5xl mx-auto space-y-8">
					<div className="text-center space-y-2">
						<h1 className="text-4xl font-bold text-gray-900">
							{auction.itemName}
						</h1>
						<div className="flex items-center justify-center gap-4">
							<span className="inline-flex items-center text-gray-600">
								<Clock className="w-4 h-4 mr-1" /> {timeLeft}
							</span>
						</div>
					</div>

					<div className="bg-white p-8 rounded-xl shadow-lg space-y-8">
						<div className="text-center space-y-2">
							<p className="text-gray-500 text-sm">
								Current Highest Bid
							</p>
							<p className="text-5xl font-bold text-indigo-600">
								₹{currentBid.toLocaleString()}
							</p>
						</div>

						<div className="flex items-center justify-center gap-6">
							<Button
								onClick={() =>
									setNewBid(
										newBid -
											parseFloat(auction.bidIncrement)
									)
								}
								disabled={
									currentBid +
										parseFloat(auction.bidIncrement) ===
									newBid
								}
								className="w-16 h-16 text-3xl rounded-full"
								variant="outline"
								size="icon"
							>
								-
							</Button>

							<div className="text-4xl font-bold w-48 text-center py-4 border rounded-lg">
								₹{newBid.toLocaleString()}
							</div>

							<Button
								onClick={() =>
									setNewBid(
										newBid +
											parseFloat(auction.bidIncrement)
									)
								}
								className="w-16 h-16 text-3xl rounded-full"
								variant="outline"
								size="icon"
							>
								+
							</Button>
						</div>

						<Button
							onClick={placeBid}
							className="w-full py-6 text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
						>
							<Zap className="w-5 h-5 mr-2" /> Place Bid
						</Button>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div className="bg-white p-4 rounded-lg border flex items-center">
							<TrendingUp className="w-6 h-6 text-gray-500 mr-3" />
							<div>
								<p className="text-sm text-gray-500">
									Bid Increment
								</p>
								<p className="text-lg font-semibold">
									₹{auction.bidIncrement.toLocaleString()}
								</p>
							</div>
						</div>
						<div className="bg-white p-4 rounded-lg border flex items-center">
							<Gavel className="w-6 h-6 text-gray-500 mr-3" />
							<div>
								<p className="text-sm text-gray-500">
									Starting Price
								</p>
								<p className="text-lg font-semibold">
									₹{auction.startingPrice.toLocaleString()}
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Notifications */}
			<div className="border border-gray-200 p-6 bg-white max-h-screen overflow-y-auto">
				<div className="flex items-center mb-6">
					<Bell className="w-5 h-5 text-gray-500 mr-2" />
					<h2 className="text-lg font-semibold">Bid Activity</h2>
				</div>
				{notifications.length === 0 ? (
					<p className="text-gray-500">No bid activity yet</p>
				) : (
					<div className="space-y-3">
						{notifications.map((n) => (
							<div
								key={n.id}
								className="p-3 bg-gray-50 rounded-lg border"
							>
								<p className="font-medium">{n.message}</p>
								<p className="text-xs text-gray-500">
									{n.timestamp}
								</p>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
};

export default LiveAuction;
