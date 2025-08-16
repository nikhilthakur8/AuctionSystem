import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useUserContext } from "@/context/context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Navigate } from "react-router-dom";
import { Eye, Play, RotateCcw, Users, Gavel, Clock } from "lucide-react";

const AdminPanel = () => {
	const { userData } = useUserContext();
	const [auctions, setAuctions] = useState([]);
	const [users, setUsers] = useState([]);
	const [stats, setStats] = useState({
		totalAuctions: 0,
		activeAuctions: 0,
		totalUsers: 0,
		totalBids: 0,
	});
	const [loading, setLoading] = useState(true);

	const backendUrl = import.meta.env.VITE_BACKEND_URL || "";

	const fetchAdminData = useCallback(async () => {
		try {
			const [auctionsRes, usersRes, statsRes] = await Promise.all([
				axios.get(`${backendUrl}/api/admin/auctions`, {
					withCredentials: true,
				}),
				axios.get(`${backendUrl}/api/admin/users`, {
					withCredentials: true,
				}),
				axios.get(`${backendUrl}/api/admin/stats`, {
					withCredentials: true,
				}),
			]);

			setAuctions(auctionsRes.data.auctions || []);
			setUsers(usersRes.data.users || []);
			setStats(statsRes.data.stats || stats);
		} catch (err) {
			toast.error("Failed to fetch admin data");
			console.error(err);
		} finally {
			setLoading(false);
		}
	}, [backendUrl, stats]);

	useEffect(() => {
		fetchAdminData();
	}, [fetchAdminData]);

	// Check if user is admin
	if (!userData || userData.role !== "admin") {
		return <Navigate to="/" replace />;
	}

	const handleStartAuction = async (auctionId) => {
		try {
			await axios.post(
				`${backendUrl}/api/admin/auctions/${auctionId}/start`,
				{},
				{ withCredentials: true }
			);
			toast.success("Auction started manually");
			fetchAdminData();
		} catch (err) {
			toast.error(
				err.response?.data?.message || "Failed to start auction"
			);
		}
	};

	const handleResetAuction = async (auctionId) => {
		try {
			await axios.post(
				`${backendUrl}/api/admin/auctions/${auctionId}/reset`,
				{},
				{ withCredentials: true }
			);
			toast.success("Auction reset successfully");
			fetchAdminData();
		} catch (err) {
			toast.error(
				err.response?.data?.message || "Failed to reset auction"
			);
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen flex justify-center items-center">
				<div className="text-lg">Loading admin panel...</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50 p-6 py-20">
			<div className="max-w-7xl mx-auto">
				<h1 className="text-3xl font-light tracking-tight text-gray-900 mb-8">
					Admin Panel
				</h1>

				{/* Stats Cards */}
				<div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">
								Total Auctions
							</CardTitle>
							<Gavel className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">
								{stats.totalAuctions}
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">
								Active Auctions
							</CardTitle>
							<Clock className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">
								{stats.activeAuctions}
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">
								Total Users
							</CardTitle>
							<Users className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">
								{stats.totalUsers}
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">
								Total Bids
							</CardTitle>
							<Gavel className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">
								{stats.totalBids}
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Auctions Management */}
				<Card className="mb-8">
					<CardHeader>
						<CardTitle>Auctions Management</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							{auctions.map((auction) => (
								<div
									key={auction.id}
									className="flex items-center justify-between p-4 border rounded-lg"
								>
									<div className="flex-1">
										<h3 className="font-semibold">
											{auction.itemName}
										</h3>
										<p className="text-sm text-gray-600">
											Starting Price: ₹
											{parseFloat(
												auction.startingPrice
											).toLocaleString()}
										</p>
										<p className="text-sm text-gray-600">
											Seller:{" "}
											{auction.seller?.name || "Unknown"}
										</p>
									</div>
									<div className="flex items-center space-x-4 uppercase">
										<Badge variant={auction.status}>
											{auction.status}
										</Badge>
										<div className="flex space-x-2">
											<Button
												size="sm"
												variant="outline"
												onClick={() =>
													window.open(
														`/auction/${auction.id}`,
														"_blank"
													)
												}
												title="View Auction"
											>
												<Eye className="h-4 w-4" />
											</Button>
											{auction.status !== "active" && (
												<Button
													size="sm"
													onClick={() =>
														handleStartAuction(
															auction.id
														)
													}
													title="Start Auction"
												>
													<Play className="h-4 w-4" />
												</Button>
											)}
											<Button
												size="sm"
												variant="destructive"
												onClick={() =>
													handleResetAuction(
														auction.id
													)
												}
												title="Reset Auction"
											>
												<RotateCcw className="h-4 w-4" />
											</Button>
										</div>
									</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>

				{/* Users Management */}
				<Card>
					<CardHeader>
						<CardTitle>Users Overview</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							{users.map((user) => (
								<div
									key={user.id}
									className="flex items-center justify-between p-4 border rounded-lg"
								>
									<div>
										<h3 className="font-semibold">
											{user.name}
										</h3>
										<p className="text-sm text-gray-600">
											{user.email}
										</p>
									</div>
									<Badge
										variant={
											user.role === "admin"
												? "destructive"
												: "outline"
										}
										className={"uppercase"}
									>
										{user.role}
									</Badge>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
};

export default AdminPanel;
