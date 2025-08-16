import React, { useState, useEffect } from "react";
import { UserContext } from "./context";
import axios from "axios";
import { set } from "date-fns";

export const UserContextProvider = ({ children }) => {
	const [userData, setUserData] = useState(null);
	const login = (userData) => setUserData(userData);
	const logout = () => setUserData(null);

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
