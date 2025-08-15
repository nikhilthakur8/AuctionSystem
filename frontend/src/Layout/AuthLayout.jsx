import React, { useEffect } from "react";
import { Outlet } from "react-router-dom";

export const AuthLayout = () => {
	useEffect(() => {
		window.scrollTo(0, 0);
	}, []);
	return (
		<div>
			<Outlet />
		</div>
	);
};
