import React from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
	CardContent,
	CardFooter,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const CreateAuction = () => {
	const navigate = useNavigate();
	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm();

	const backendUrl = import.meta.env.VITE_BACKEND_URL;

	const onSubmit = async (data) => {
		try {
			const payload = {
				itemName: data.itemName,
				description: data.description || "",
				startingPrice: parseFloat(data.startingPrice),
				bidIncrement: parseFloat(data.bidIncrement),
				goLiveTime: data.goLiveTime,
				duration: parseInt(data.duration, 10),
			};
			const res = await axios.post(
				`${backendUrl}/api/auction/create`,
				payload,
				{ withCredentials: true }
			);
			if (res.data.success) {
				toast.success("Auction created successfully");
				navigate("/auctions");
			} else {
				toast.error("Failed to create auction");
			}
		} catch (err) {
			toast.error(err?.response?.data?.message || "An error occurred");
		}
	};

	return (
		<div className="flex min-h-screen items-center justify-center bg-gray-100 p-6 py-24 ">
			<Card className="w-full max-w-2xl rounded-xl border border-gray-200 bg-white shadow-lg">
				<CardHeader className="text-center">
					<CardTitle className="text-2xl font-semibold text-gray-800">
						Create Auction
					</CardTitle>
					<CardDescription className="text-gray-600">
						Fill in the auction details below
					</CardDescription>
				</CardHeader>

				<CardContent>
					<form
						className="flex flex-col gap-4"
						onSubmit={handleSubmit(onSubmit)}
					>
						{/* Item Name */}
						<div className="grid gap-2">
							<Label htmlFor="itemName">Item Name</Label>
							<Input
								id="itemName"
								placeholder="Awesome Item"
								{...register("itemName", {
									required: "Item name is required",
								})}
								className="bg-gray-50 focus:ring-2 focus:ring-indigo-500"
							/>
							{errors.itemName && (
								<p className="text-sm text-red-600">
									{errors.itemName.message}
								</p>
							)}
						</div>

						{/* Description */}
						<div className="grid gap-2">
							<Label htmlFor="description">Description</Label>
							<Input
								id="description"
								placeholder="Optional description"
								{...register("description")}
								className="bg-gray-50 focus:ring-2 focus:ring-indigo-500"
							/>
						</div>

						{/* Starting Price */}
						<div className="grid gap-2">
							<Label htmlFor="startingPrice">
								Starting Price
							</Label>
							<Input
								id="startingPrice"
								type="number"
								step="0.01"
								placeholder="0.00"
								{...register("startingPrice", {
									required: "Starting price is required",
									min: {
										value: 0,
										message: "Must be positive",
									},
								})}
								className="bg-gray-50 focus:ring-2 focus:ring-indigo-500"
							/>
							{errors.startingPrice && (
								<p className="text-sm text-red-600">
									{errors.startingPrice.message}
								</p>
							)}
						</div>

						{/* Bid Increment */}
						<div className="grid gap-2">
							<Label htmlFor="bidIncrement">Bid Increment</Label>
							<Input
								id="bidIncrement"
								type="number"
								step="0.01"
								placeholder="0.01"
								{...register("bidIncrement", {
									required: "Bid increment is required",
									min: {
										value: 0.01,
										message: "Must be at least 0.01",
									},
								})}
								className="bg-gray-50 focus:ring-2 focus:ring-indigo-500"
							/>
							{errors.bidIncrement && (
								<p className="text-sm text-red-600">
									{errors.bidIncrement.message}
								</p>
							)}
						</div>

						{/* Go Live Time */}
						<div className="grid gap-2">
							<Label htmlFor="goLiveTime">Go Live Time</Label>
							<Input
								id="goLiveTime"
								type="datetime-local"
								{...register("goLiveTime", {
									required: "Go live time is required",
								})}
								className="bg-gray-50 focus:ring-2 focus:ring-indigo-500"
							/>
							{errors.goLiveTime && (
								<p className="text-sm text-red-600">
									{errors.goLiveTime.message}
								</p>
							)}
						</div>

						{/* Duration */}
						<div className="grid gap-2">
							<Label htmlFor="duration">Duration (minutes)</Label>
							<Input
								id="duration"
								type="number"
								placeholder="Enter duration"
								{...register("duration", {
									required: "Duration is required",
									min: {
										value: 1,
										message:
											"Duration must be at least 1 minute",
									},
								})}
								className="bg-gray-50 focus:ring-2 focus:ring-indigo-500"
							/>
							{errors.duration && (
								<p className="text-sm text-red-600">
									{errors.duration.message}
								</p>
							)}
						</div>

						<Button
							type="submit"
							className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white"
							disabled={isSubmitting}
						>
							{isSubmitting ? "Creating..." : "Create Auction"}
						</Button>
					</form>
				</CardContent>

				<CardFooter className="justify-center text-sm text-gray-700">
					Want to see all auctions?{" "}
					<span
						onClick={() => navigate("/auctions")}
						className="ml-1 cursor-pointer text-indigo-600 hover:underline"
					>
						View Auctions
					</span>
				</CardFooter>
			</Card>
		</div>
	);
};

export default CreateAuction;
