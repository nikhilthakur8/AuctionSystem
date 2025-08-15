import React, { useEffect, useState, useCallback, useMemo } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
	Card,
	CardHeader,
	CardTitle,
	CardContent,
	CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

const Auctions = () => {
	const navigate = useNavigate();
	const [auctions, setAuctions] = useState([]);
	const [loading, setLoading] = useState(true);

	const backendUrl = import.meta.env.VITE_BACKEND_URL || "";

	useEffect(() => {
		window.scrollTo(0, 0);
	}, []);

	// Fetch auctions from backend
	const fetchAuctions = useCallback(async () => {
		try {
			const res = await axios.get(`${backendUrl}/api/auction/list`, {
				withCredentials: true,
			});
			if (res.data.success && Array.isArray(res.data.auctions)) {
				setAuctions(res.data.auctions);
			} else {
				setAuctions([]);
			}
		} catch (err) {
			toast.error(err.message || "Failed to fetch auctions");
		} finally {
			setLoading(false);
		}
	}, [backendUrl]);

	useEffect(() => {
		fetchAuctions();
	}, [fetchAuctions]);

	// Calculate auction status based on time
	const calculateStatus = (auction) => {
		const now = new Date();
		const startTime = new Date(auction.goLiveTime);
		const endTime = new Date(
			startTime.getTime() + auction.duration * 60 * 1000
		);

		if (now < startTime) return "upcoming";
		if (now >= startTime && now <= endTime) return "live";
		return "closed";
	};

	useEffect(() => {
		// Recalculate statuses every 30 seconds
		const interval = setInterval(() => {
			setAuctions((prev) => [...prev]); // triggers re-render to recalc statuses
		}, 30000);

		return () => clearInterval(interval);
	}, []);

	const getStatusBadge = (status) => {
		switch (status) {
			case "live":
				return "bg-green-100 text-green-800";
			case "upcoming":
				return "bg-yellow-100 text-yellow-800";
			case "closed":
				return "bg-red-100 text-red-800";
			default:
				return "bg-gray-100 text-gray-800";
		}
	};

	// Group auctions by status
	const groupedAuctions = useMemo(() => {
		const groups = { live: [], upcoming: [], closed: [] };
		auctions.forEach((auction) => {
			const status = calculateStatus(auction);
			groups[status].push(auction);
		});
		return groups;
	}, [auctions]);

	const renderAuctionCard = (auction) => {
		const status = calculateStatus(auction);
		return (
			<Card
				key={auction.id}
				className="bg-white border border-gray-200 hover:border-indigo-100 hover:shadow-lg transition-all duration-300 ease-in-out overflow-hidden group flex flex-col justify-between h-full"
			>
				<CardHeader>
					<div className="flex justify-between items-start">
						<CardTitle className="text-lg font-medium text-gray-900 group-hover:text-indigo-600 transition-colors duration-200">
							{auction.itemName}
						</CardTitle>
						<span
							className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(
								status
							)}`}
						>
							{status.charAt(0).toUpperCase() + status.slice(1)}
						</span>
					</div>
				</CardHeader>
				<CardContent className="space-y-3">
					<p className="text-sm text-gray-600 line-clamp-3">
						{auction.description || "No description provided"}
					</p>
					<div className="flex items-center justify-between pt-2">
						<div>
							<p className="text-xs text-gray-400">
								Starting price
							</p>
							<p className="font-semibold text-gray-900">
								₹ {auction.startingPrice.toLocaleString()}
							</p>
							<p className="text-xs text-gray-400 mt-1">
								Bid increment
							</p>
							<p className="font-semibold text-gray-900">
								₹ {auction.bidIncrement.toLocaleString()}
							</p>
						</div>
						<div className="text-right">
							<p className="text-xs text-gray-400">Starts</p>
							<p className="text-sm text-gray-600">
								{new Date(auction.goLiveTime).toDateString()}
							</p>
						</div>
					</div>
				</CardContent>
				<CardFooter className="pt-3">
					<Button
						variant="outline"
						className="w-full border-indigo-300 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-400 transition-colors duration-200"
						onClick={() => navigate(`/auction/${auction.id}`)}
					>
						View Auction
					</Button>
				</CardFooter>
			</Card>
		);
	};

	if (loading) {
		return (
			<div className="p-8 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
				<div className="max-w-7xl mx-auto">
					<Skeleton className="h-10 w-64 mb-8 rounded-lg" />
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
						{[...Array(6)].map((_, i) => (
							<Card key={i} className="overflow-hidden">
								<CardHeader>
									<Skeleton className="h-6 w-3/4 rounded-md" />
									<Skeleton className="h-4 w-1/2 mt-2 rounded-md" />
								</CardHeader>
								<CardContent className="space-y-3">
									<Skeleton className="h-4 w-full rounded-md" />
									<Skeleton className="h-4 w-5/6 rounded-md" />
									<Skeleton className="h-4 w-4/6 rounded-md" />
								</CardContent>
								<CardFooter>
									<Skeleton className="h-10 w-full rounded-md" />
								</CardFooter>
							</Card>
						))}
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen p-6 py-20">
			<div className="max-w-7xl mx-auto">
				<div className="flex justify-between items-end mb-8">
					<div>
						<h2 className="text-3xl font-light text-gray-900 tracking-tight">
							Available Auctions
						</h2>
						<p className="text-gray-500 mt-2">
							{auctions.length} total auctions
						</p>
					</div>
					<Button
						variant="outline"
						className="border-indigo-300 text-indigo-600 hover:bg-indigo-50"
						onClick={fetchAuctions}
					>
						Refresh
					</Button>
				</div>

				{["live", "upcoming", "closed"].map((status) => (
					<div key={status} className="mb-12">
						<h3 className="text-xl font-semibold mb-4 capitalize">
							{status} Auctions
						</h3>
						{groupedAuctions[status].length === 0 ? (
							<p className="text-gray-500 text-sm">
								No {status} auctions.
							</p>
						) : (
							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
								{groupedAuctions[status].map(renderAuctionCard)}
							</div>
						)}
					</div>
				))}
			</div>
		</div>
	);
};

export default Auctions;
