import React, { useEffect, useState } from "react";
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
import { Trash2, Eye, Plus, RefreshCw } from "lucide-react";

const MyAuctions = () => {
	const navigate = useNavigate();
	const [auctions, setAuctions] = useState([]);
	const [loading, setLoading] = useState(true);
	const backendUrl =
		import.meta.env.VITE_BACKEND_URL || import.meta.env.BACKEND_URL || "";

	// Calculate status based on goLiveTime and duration (in minutes)
	const calculateStatus = (auction) => {
		const now = new Date();
		const startTime = new Date(auction.goLiveTime);
		const endTime = new Date(
			startTime.getTime() + auction.duration * 60 * 1000 // minutes → ms
		);

		if (now < startTime) return "upcoming";
		if (now >= startTime && now <= endTime) return "live";
		return "closed";
	};

	useEffect(() => {
		window.scrollTo(0, 0);
		fetchMyAuctions();

		// Auto-update statuses every 30 seconds
		const interval = setInterval(() => {
			setAuctions((prev) => [...prev]);
		}, 30000);

		return () => clearInterval(interval);
	}, [backendUrl]);

	const fetchMyAuctions = async () => {
		setLoading(true);
		try {
			const res = await axios.get(
				`${backendUrl}/api/auction/my-auctions`,
				{
					withCredentials: true,
				}
			);
			setAuctions(res.data.auctions || []);
		} catch (err) {
			toast.error(
				err.response?.data?.message || "Failed to fetch auctions"
			);
		} finally {
			setLoading(false);
		}
	};

	const handleDelete = async (id) => {
		if (!window.confirm("Are you sure you want to delete this auction?"))
			return;
		try {
			await axios.delete(`${backendUrl}/api/auction/${id}`, {
				withCredentials: true,
			});
			toast.success("Auction deleted successfully");
			fetchMyAuctions();
		} catch (err) {
			toast.error(
				err.response?.data?.message || "Failed to delete auction"
			);
		}
	};

	const getStatusBadge = (status) => {
		switch (status) {
			case "live":
				return "bg-green-100 text-green-800 animate-pulse";
			case "upcoming":
				return "bg-blue-100 text-blue-800";
			case "closed":
				return "bg-gray-100 text-gray-800";
			default:
				return "bg-gray-100 text-gray-800";
		}
	};

	if (loading) {
		return (
			<div className="p-8 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
				<div className="max-w-7xl mx-auto">
					<div className="flex justify-between items-center mb-8">
						<Skeleton className="h-10 w-48 rounded-lg" />
						<Skeleton className="h-10 w-40 rounded-lg" />
					</div>
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
								<CardFooter className="flex justify-between gap-2">
									<Skeleton className="h-10 w-24 rounded-md" />
									<Skeleton className="h-10 w-24 rounded-md" />
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
				<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
					<div>
						<h2 className="text-3xl font-light text-gray-900 tracking-tight">
							My Auctions
						</h2>
						<p className="text-gray-500 mt-2">
							{auctions.length}{" "}
							{auctions.length === 1 ? "auction" : "auctions"}{" "}
							created
						</p>
					</div>
					<div className="flex gap-3">
						<Button
							variant="outline"
							className="border-indigo-300 text-indigo-600 hover:bg-indigo-50 flex items-center gap-2"
							onClick={fetchMyAuctions}
						>
							<RefreshCw className="w-4 h-4" />
							Refresh
						</Button>
						<Button
							className="bg-indigo-600 hover:bg-indigo-700 flex items-center gap-2"
							onClick={() => navigate("/auctions/create")}
						>
							<Plus className="w-4 h-4" />
							Create Auction
						</Button>
					</div>
				</div>

				{auctions.length === 0 ? (
					<div className="bg-white flex items-center flex-col rounded-xl p-12 text-center border border-gray-200 shadow-sm">
						<h3 className="text-lg font-medium text-gray-900 mb-2">
							No auctions created yet
						</h3>
						<p className="text-gray-500 max-w-md mx-auto">
							You haven't created any auctions yet. Start by
							creating your first auction.
						</p>
						<Button
							className="mt-6 bg-indigo-600 hover:bg-indigo-700 flex items-center gap-2"
							onClick={() => navigate("/create-auction")}
						>
							<Plus className="w-4 h-4" />
							Create Your First Auction
						</Button>
					</div>
				) : (
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
						{auctions.map((auction) => {
							const status = calculateStatus(auction);
							return (
								<Card
									key={auction.id}
									className="bg-white border border-gray-200 hover:border-indigo-100 hover:shadow-lg transition-all duration-300 ease-in-out overflow-hidden group"
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
												{status
													.charAt(0)
													.toUpperCase() +
													status.slice(1)}
											</span>
										</div>
									</CardHeader>

									<CardContent className="space-y-3">
										<p className="text-sm text-gray-600 line-clamp-3">
											{auction.description ||
												"No description provided"}
										</p>
										<div className="flex items-center justify-between pt-2">
											<div>
												<p className="text-xs text-gray-400">
													Starting price
												</p>
												<p className="font-semibold text-gray-900">
													₹
													{auction.startingPrice.toLocaleString()}
												</p>
											</div>
											<div className="text-right">
												<p className="text-xs text-gray-400">
													{status === "live"
														? "Ends"
														: "Starts"}
												</p>
												<p className="text-sm text-gray-600">
													{status === "live"
														? new Date(
																new Date(
																	auction.goLiveTime
																).getTime() +
																	auction.duration *
																		60 *
																		1000
														  ).toLocaleString()
														: new Date(
																auction.goLiveTime
														  ).toLocaleString()}
												</p>
											</div>
										</div>
									</CardContent>

									<CardFooter className="pt-3 flex justify-between gap-2">
										<Button
											variant="outline"
											className="border-indigo-300 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-400 transition-colors duration-200 flex items-center gap-2 flex-1"
											onClick={() =>
												navigate(
													`/auction/${auction.id}`
												)
											}
										>
											<Eye className="w-4 h-4" />
											View
										</Button>

										<Button
											variant="destructive"
											className="flex items-center gap-2 flex-1"
											onClick={() =>
												handleDelete(auction.id)
											}
										>
											<Trash2 className="w-4 h-4" />
											Delete
										</Button>
									</CardFooter>
								</Card>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
};

export default MyAuctions;
