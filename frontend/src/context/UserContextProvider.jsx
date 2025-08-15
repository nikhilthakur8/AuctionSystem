import React, { useState, useEffect } from "react";
import { UserContext } from "./context";
import axios from "axios";

export const UserContextProvider = ({ children }) => {
	const [userData, setUserData] = useState(null);
	const login = (userData) => setUserData(userData);
	const logout = () => setUserData(null);
	const backendUrl = import.meta.env.VITE_BACKEND_URL || "";

	useEffect(() => {
		async function fetchProfile() {
			try {
				const res = await axios.get(`${backendUrl}/api/user/profile`, {
					withCredentials: true,
				});
				if (res.data.success && res.data.user) {
					setUserData(res.data.user);
				}
			} catch {
				// no user
			}
		}
		fetchProfile();
	}, [backendUrl]);

	return (
		<UserContext.Provider
			value={{
				userData,
				login,
				logout,
			}}
		>
			{children}
		</UserContext.Provider>
	);
};
