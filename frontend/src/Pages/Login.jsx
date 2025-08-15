import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
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
import { Eye, EyeOff } from "lucide-react";
import axios from "axios";
import { useUserContext } from "@/context/context";

const Login = () => {
	const [showPassword, setShowPassword] = useState(false);
	const navigate = useNavigate();
	const { login } = useUserContext();
	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm();

	const onSubmit = async (data) => {
		const backendUrl = import.meta.env.VITE_BACKEND_URL;
		try {
			const res = await axios.post(`${backendUrl}/api/auth/login`, data, {
				withCredentials: true,
			});
			login(res.data.user);
			toast.success("Login successful");
			navigate("/");
		} catch (err) {
			toast.error(err?.response?.data?.message || "Login failed");
		}
	};

	return (
		<div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
			<Card className="w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-lg">
				<CardHeader className="text-center">
					<CardTitle className="text-2xl font-semibold text-gray-800">
						Login
					</CardTitle>
					<CardDescription className="text-gray-600">
						Enter your credentials
					</CardDescription>
				</CardHeader>

				<CardContent>
					<form
						className="flex flex-col gap-4"
						onSubmit={handleSubmit(onSubmit)}
					>
						<div className="grid gap-2">
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								type="email"
								placeholder="johncena@gmail.com"
								{...register("email", {
									required: "Email is required",
									pattern: {
										value: /^[^@\s]+@[^@\s]+\.[^@\s]+$/,
										message: "Invalid email",
									},
								})}
								className="bg-gray-50 text-black focus:ring-2 focus:ring-indigo-500"
							/>
							{errors.email && (
								<p className="text-sm text-red-600">
									{errors.email.message}
								</p>
							)}
						</div>

						<div className="grid gap-1">
							<Label htmlFor="password">Password</Label>
							<div className="relative">
								<Input
									id="password"
									type={showPassword ? "text" : "password"}
									placeholder="You can't see me"
									{...register("password", {
										required: "Password is required",
										minLength: {
											value: 6,
											message:
												"Password must be at least 6 characters",
										},
									})}
									className="bg-gray-50 text-black pr-10 focus:ring-2 focus:ring-indigo-500"
								/>
								<button
									type="button"
									onClick={() =>
										setShowPassword(!showPassword)
									}
									className="absolute inset-y-0 right-2 flex items-center text-gray-500 hover:text-gray-700"
								>
									{showPassword ? (
										<EyeOff className="h-5 w-5" />
									) : (
										<Eye className="h-5 w-5" />
									)}
								</button>
							</div>
							{errors.password && (
								<p className="text-sm text-red-600">
									{errors.password.message}
								</p>
							)}
						</div>

						<Button
							type="submit"
							className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white"
							disabled={isSubmitting}
						>
							{isSubmitting ? "Logging in..." : "Login"}
						</Button>
					</form>
				</CardContent>

				<CardFooter className="justify-center text-sm text-gray-700">
					Don't have an account?{" "}
					<span
						onClick={() => navigate("/register")}
						className="ml-1 cursor-pointer text-indigo-600 hover:underline"
					>
						Register
					</span>
				</CardFooter>
			</Card>
		</div>
	);
};

export default Login;
